import type { GraphEdge, GraphNode, LabelPosition, NodeKind } from "./CollaborationGraph";

/** Evenly spaces `count` points on a circle, starting at `startDeg` (0° = right, clockwise). */
export function ring(cx: number, cy: number, radius: number, count: number, startDeg = -90, spanDeg = 360): Array<{ x: number; y: number; angle: number }> {
  const step = spanDeg === 360 ? spanDeg / Math.max(count, 1) : spanDeg / Math.max(count - 1, 1);
  return Array.from({ length: count }, (_, i) => {
    const angle = ((startDeg + step * i) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), angle };
  });
}

/** Label side that points away from the centre, so labels never sit on edges. */
export function outwardLabel(angle: number): LabelPosition {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  if (Math.abs(s) > 0.8) return s > 0 ? "below" : "above";
  return c > 0 ? "right" : "left";
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

interface HubItem {
  label: string;
  kind: NodeKind;
  checked?: boolean;
  seed?: string;
}

/**
 * A hub with items around it: a project and its skills, a person and what they
 * bring, a team and its capabilities.
 */
export function hubLayout(hub: { id: string; label: string; kind: NodeKind; seed?: string }, items: HubItem[], opts: { width: number; height: number; radius?: number; startDeg?: number }) {
  const cx = opts.width / 2;
  const cy = opts.height / 2;
  const radius = opts.radius ?? Math.min(opts.width, opts.height) / 2 - 48;
  const points = ring(cx, cy, radius, items.length, opts.startDeg ?? -90);
  const nodes: GraphNode[] = [{ id: hub.id, label: hub.label, kind: hub.kind, seed: hub.seed, x: cx, y: cy, labelPosition: "below" }];
  const edges: GraphEdge[] = [];
  items.forEach((item, i) => {
    const p = points[i]!;
    const id = `${item.kind}-${slug(item.label)}`;
    nodes.push({ id, label: item.label, kind: item.kind, checked: item.checked, seed: item.seed, x: p.x, y: p.y, labelPosition: outwardLabel(p.angle) });
    edges.push({ from: hub.id, to: id, tone: item.kind === "missing" ? "missing" : "default" });
  });
  return { nodes, edges };
}
