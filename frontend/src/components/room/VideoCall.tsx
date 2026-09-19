"use client";

import type { AudioVideoFacade, MeetingSession, VideoTileState } from "amazon-chime-sdk-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { humanError } from "@/lib/errors";
import { firstName } from "@/lib/format";
import { api, type RoomCall, type UserSummary } from "@/services/api";

type Phase = "idle" | "joining" | "in-call" | "error";

interface Participant {
  attendeeId: string;
  userId: string;
  tileId?: number;
}

/** Binds one Chime video tile to its <video> element. */
function VideoTile({ av, tileId, mirrored }: { av: AudioVideoFacade; tileId: number; mirrored: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) av.bindVideoElement(tileId, ref.current);
    return () => av.unbindVideoElement(tileId);
  }, [av, tileId]);
  return <video ref={ref} className={`absolute inset-0 h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""}`} autoPlay playsInline muted />;
}

function ControlButton({ on, onClick, labelOn, labelOff }: { on: boolean; onClick: () => void; labelOn: string; labelOff: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`h-10 rounded-btn border-2 border-ink px-3 text-sm font-bold shadow-brutal-sm active:translate-y-0.5 active:shadow-none ${on ? "bg-surface" : "bg-tomato"}`}
    >
      {on ? labelOn : labelOff}
    </button>
  );
}

interface VideoCallProps {
  projectId: string;
  meId: string;
  members: UserSummary[];
  call: RoomCall | null;
  onCallStarted: (call: RoomCall) => void;
}

/**
 * The team's video call on Amazon Chime. Joining asks the API for a meeting
 * ticket, then the Chime SDK connects camera and microphone. Anyone missing a
 * camera (or who says no to it) still joins with audio.
 */
export function VideoCall({ projectId, meId, members, call, onCallStarted }: VideoCallProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  // Render state; the refs below are only for event handlers.
  const [av, setAv] = useState<AudioVideoFacade | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const sessionRef = useRef<MeetingSession | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cameraId = useRef<string | undefined>(undefined);
  const byId = new Map(members.map((m) => [m.userId, m]));

  const leave = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      const av = session.audioVideo;
      av.stopLocalVideoTile();
      av.stop();
      await av.stopVideoInput().catch(() => undefined);
      await av.stopAudioInput().catch(() => undefined);
    }
    setAv(null);
    setHasCamera(false);
    setParticipants(new Map());
    setCameraOn(false);
    setMuted(false);
    setPhase("idle");
  }, []);

  // Leave cleanly if the page goes away mid-call.
  useEffect(() => () => void leave(), [leave]);

  async function join() {
    setPhase("joining");
    setError(undefined);
    setNotice(undefined);
    try {
      const joined = await api.joinCall(meId, projectId);
      if (joined.started) onCallStarted({ meetingId: joined.meeting.MeetingId, startedBy: meId, startedAt: new Date().toISOString() });
      const chime = await import("amazon-chime-sdk-js");
      const logger = new chime.ConsoleLogger("radius-call", chime.LogLevel.ERROR);
      const session = new chime.DefaultMeetingSession(new chime.MeetingSessionConfiguration(joined.meeting, joined.attendee), logger, new chime.DefaultDeviceController(logger));
      sessionRef.current = session;
      const av = session.audioVideo;

      av.realtimeSubscribeToAttendeeIdPresence((attendeeId, present, externalUserId) => {
        if (!externalUserId || attendeeId.includes("#content")) return;
        setParticipants((prev) => {
          const next = new Map(prev);
          if (present) next.set(attendeeId, { attendeeId, userId: externalUserId, tileId: prev.get(attendeeId)?.tileId });
          else next.delete(attendeeId);
          return next;
        });
      });
      av.addObserver({
        videoTileDidUpdate: (tile: VideoTileState) => {
          if (!tile.boundAttendeeId || !tile.tileId || tile.isContent) return;
          const attendeeId = tile.boundAttendeeId;
          const userId = tile.boundExternalUserId ?? meId;
          setParticipants((prev) => new Map(prev).set(attendeeId, { attendeeId, userId, tileId: tile.tileId! }));
        },
        videoTileWasRemoved: (tileId: number) => {
          setParticipants((prev) => {
            const next = new Map(prev);
            for (const [id, p] of next) if (p.tileId === tileId) next.set(id, { ...p, tileId: undefined });
            return next;
          });
        },
        audioVideoDidStop: () => void leave(),
      });

      const notes: string[] = [];
      const mics = await av.listAudioInputDevices().catch(() => []);
      if (mics[0]) await av.startAudioInput(mics[0].deviceId).catch(() => notes.push("We couldn't use your microphone, so you're listening only."));
      else notes.push("No microphone found, so you're listening only.");
      if (audioRef.current) await av.bindAudioElement(audioRef.current);

      av.start();

      const cams = await av.listVideoInputDevices().catch(() => []);
      cameraId.current = cams[0]?.deviceId;
      setHasCamera(Boolean(cameraId.current));
      if (cameraId.current) {
        try {
          await av.startVideoInput(cameraId.current);
          av.startLocalVideoTile();
          setCameraOn(true);
        } catch {
          notes.push("Your camera is off (no permission).");
        }
      }
      if (notes.length) setNotice(notes.join(" "));
      setAv(av);
      setPhase("in-call");
    } catch (err) {
      await leave();
      setError(humanError(err, "We couldn't connect the call. Check your connection and try again."));
      setPhase("error");
    }
  }

  function toggleMute() {
    const av = sessionRef.current?.audioVideo;
    if (!av) return;
    if (muted) av.realtimeUnmuteLocalAudio();
    else av.realtimeMuteLocalAudio();
    setMuted(!muted);
  }

  async function toggleCamera() {
    const av = sessionRef.current?.audioVideo;
    if (!av || !cameraId.current) return;
    if (cameraOn) {
      av.stopLocalVideoTile();
      await av.stopVideoInput();
      setCameraOn(false);
    } else {
      await av.startVideoInput(cameraId.current);
      av.startLocalVideoTile();
      setCameraOn(true);
    }
  }

  const starter = call ? byId.get(call.startedBy) : undefined;

  return (
    <section aria-label="Team call" className="overflow-hidden rounded-panel border-[2.5px] border-ink bg-surface shadow-brutal">
      <header className="flex items-center justify-between gap-3 border-b-[2.5px] border-ink bg-lilac px-5 py-3">
        <h2 className="text-xl font-extrabold">Team call</h2>
        {phase === "in-call" && (
          <span className="rounded-btn border-2 border-ink bg-tomato px-2 py-0.5 font-mono text-[11px] font-bold uppercase">
            <span className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-ink" aria-hidden="true" />
            On air
          </span>
        )}
      </header>
      {/* Remote audio for everyone in the call plays through this element. */}
      <audio ref={audioRef} className="hidden" />

      <div className="p-5">
        {phase !== "in-call" && (
          <div className="space-y-4">
            {call ? (
              <p className="rounded-card border-2 border-ink bg-mustard px-4 py-3 text-[15px] font-semibold shadow-brutal-sm">
                {call.startedBy === meId ? "You started a call." : `${firstName(starter?.name ?? "A teammate")} started a call.`} Jump in!
              </p>
            ) : (
              <p className="text-[15px] text-ink-soft">Talk it through face to face. Everyone on the team can join the same call.</p>
            )}
            <Button variant="pop" size="lg" busy={phase === "joining"} onClick={join} className="w-full">
              {phase === "joining" ? "Connecting…" : call ? "Join call →" : "Start a call →"}
            </Button>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <p className="font-mono text-[11px] text-muted">Video by Amazon Chime · your browser will ask for camera and mic</p>
          </div>
        )}

        {phase === "in-call" && av && (
          <div className="space-y-4">
            <ul className="grid grid-cols-2 gap-3">
              {[...participants.values()].map((p) => {
                const person = byId.get(p.userId);
                const me = p.userId === meId;
                return (
                  <li key={p.attendeeId} className="relative aspect-video overflow-hidden rounded-card border-2 border-ink bg-ink shadow-brutal-sm">
                    {p.tileId ? (
                      <VideoTile av={av} tileId={p.tileId} mirrored={me} />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center bg-sunken">
                        <Avatar name={person?.name ?? "Guest"} seed={p.userId} size={48} />
                      </span>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 rounded-btn border-2 border-ink bg-surface px-1.5 font-mono text-[11px] font-bold">
                      {me ? "You" : firstName(person?.name ?? "Guest")}
                    </span>
                  </li>
                );
              })}
            </ul>
            {participants.size <= 1 && <p className="text-sm text-ink-soft">Waiting for teammates to join…</p>}
            {notice && <p className="rounded-card border-2 border-ink bg-warm-soft px-3 py-2 text-sm">{notice}</p>}
            <div className="flex flex-wrap gap-2">
              <ControlButton on={!muted} onClick={toggleMute} labelOn="Mute" labelOff="Unmute" />
              {hasCamera && <ControlButton on={cameraOn} onClick={() => void toggleCamera()} labelOn="Camera off" labelOff="Camera on" />}
              <Button variant="primary" onClick={() => void leave()} className="ml-auto">
                Leave call
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
