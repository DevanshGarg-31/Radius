/**
 * Team video calls with the Amazon Chime SDK. One meeting per team at a time;
 * Chime ends a meeting on its own a few minutes after everyone leaves, and we
 * create a fresh one the next time someone starts a call.
 */
import {
  ChimeSDKMeetingsClient,
  CreateAttendeeCommand,
  CreateMeetingCommand,
  GetMeetingCommand,
  NotFoundException,
  type Attendee,
  type Meeting,
} from "@aws-sdk/client-chime-sdk-meetings";
import { config } from "../config.js";

let client: ChimeSDKMeetingsClient | undefined;
const chime = () => (client ??= new ChimeSDKMeetingsClient({ region: config.region }));

/** The meeting if it is still running, otherwise undefined. */
export async function findMeeting(meetingId: string): Promise<Meeting | undefined> {
  try {
    const { Meeting: meeting } = await chime().send(new GetMeetingCommand({ MeetingId: meetingId }));
    return meeting;
  } catch (err) {
    if (err instanceof NotFoundException) return undefined;
    throw err;
  }
}

export async function createMeeting(teamId: string): Promise<Meeting> {
  const { Meeting: meeting } = await chime().send(
    new CreateMeetingCommand({
      ClientRequestToken: `${teamId}-${Date.now()}`,
      ExternalMeetingId: teamId.slice(0, 64),
      MediaRegion: config.chime.mediaRegion,
    }),
  );
  if (!meeting?.MeetingId) throw new Error("Chime did not return a meeting");
  return meeting;
}

/** A per-person ticket into the meeting. ExternalUserId lets the call show names. */
export async function createAttendee(meetingId: string, userId: string): Promise<Attendee> {
  const { Attendee: attendee } = await chime().send(new CreateAttendeeCommand({ MeetingId: meetingId, ExternalUserId: userId }));
  if (!attendee?.AttendeeId) throw new Error("Chime did not return an attendee");
  return attendee;
}
