"use client";

import { avatarTone } from "@/components/ui/Avatar";
import { initials } from "@/lib/format";

export type NodeKind = "project" | "person" | "skill" | "interest" | "missing";
export type LabelPosition = "below" | "above" | "left" | "right" | "none";

export interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** Avatar colour seed for people. */
  seed?: string;
  labelPosition?: LabelPosition;
  /** Covered skills get a check mark. */
  checked?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  tone?: "default" | "strong" | "missing";
}

interface CollaborationGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  /** Accessible summary of what the graph shows. */
  title: string;
  animate?: boolean;
  className?: string;
}

const EDGE_STYLE: Record<NonNullable<GraphEdge["tone"]>, { stroke: string; width: number; dash?: string }> = {
  default: { stroke: "var(--color-line-strong)", width: 1.25 },
  strong: { stroke: "var(--color-ink)", width: 1.5 },
  missing: { stroke: "var(--color-warm)", width: 1.5, dash: "4 4" },
};

const RADIUS: Record<NodeKind, number> = { project: 11, person: 17, skill: 6, interest: 5, missing: 13 };

function labelProps(node: GraphNode): { x: number; y: number; anchor: "start" | "middle" | "end" } | null {
  const r = RADIUS[node.kind];
  switch (node.labelPosition ?? "below") {
    case "none":
      return null;
    case "above":
      return { x: node.x, y: node.y - r - 8, anchor: "middle" };
    case "left":
      return { x: node.x - r - 8, y: node.y + 4, anchor: "end" };
    case "right":
      return { x: node.x + r + 8, y: node.y + 4, anchor: "start" };
    default:
      return { x: node.x, y: node.y + r + 16, anchor: "middle" };
  }
}

function NodeShape({ node }: { node: GraphNode }) {
  const { x, y } = node;
  switch (node.kind) {
    case "project":
      return <rect x={x - 11} y={y - 11} width={22} height={22} rx={5} fill="var(--color-ink)" />;
    case "person": {
      const tone = avatarTone(node.seed ?? node.label);
      return (
        <>
          <circle cx={x} cy={y} r={17} fill={tone.bg} stroke="var(--color-canvas)" strokeWidth={3} />
          <text x={x} y={y + 4.5} textAnchor="middle" fontSize={12} fontWeight={700} fill={tone.fg} fontFamily="var(--font-display)">
            {initials(node.label)}
          </text>
        </>
      );
    }
    case "skill":
      return (
        <>
          <circle cx={x} cy={y} r={6} fill={node.checked ? "var(--color-accent)" : "var(--color-surface)"} stroke="var(--color-accent)" strokeWidth={2} />
          {node.checked && <path d={`M${x - 2.6} ${y + 0.2}l1.8 1.8 3.4-3.6`} stroke="white" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </>
      );
    case "interest":
      return <circle cx={x} cy={y} r={5} fill="var(--color-warm)" />;
    case "missing":
      return (
        <>
          <circle cx={x} cy={y} r={13} fill="var(--color-warm-soft)" stroke="var(--color-warm)" strokeWidth={1.75} strokeDasharray="4 3" />
          <text x={x} y={y + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--color-warm-ink)" fontFamily="var(--font-display)">
            ?
          </text>
        </>
      );
  }
}

/**
 * The collaboration graph: people, skills, interests and projects as nodes.
 * Positions are supplied by the caller (see layouts.ts) so each screen can
 * compose it deliberately. Edges draw in, then nodes appear.
 */
export function CollaborationGraph({ nodes, edges, width, height, title, animate = true, className = "" }: CollaborationGraphProps) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className={`h-auto w-full overflow-visible ${className}`}>
      <title>{title}</title>
      <g>
        {edges.map((edge, i) => {
          const a = byId.get(edge.from);
          const b = byId.get(edge.to);
          if (!a || !b) return null;
          const style = EDGE_STYLE[edge.tone ?? "default"];
          const len = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={style.stroke}
              strokeWidth={style.width}
              strokeLinecap="round"
              strokeDasharray={style.dash}
              className={animate && !style.dash ? "edge-draw" : animate ? "animate-fade" : undefined}
              style={animate ? ({ "--len": len, animationDelay: `${120 + i * 55}ms` } as React.CSSProperties) : undefined}
            />
          );
        })}
      </g>
      <g>
        {nodes.map((node, i) => {
          const label = labelProps(node);
          const muted = node.kind === "skill" || node.kind === "interest";
          return (
            <g
              key={node.id}
              className={animate ? "animate-pop" : undefined}
              style={animate ? { animationDelay: `${60 + i * 45}ms`, transformBox: "fill-box", transformOrigin: "center" } : undefined}
            >
              <NodeShape node={node} />
              {label && (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  fontSize={node.kind === "project" ? 13 : 12}
                  fontWeight={node.kind === "project" || node.kind === "missing" ? 700 : 500}
                  fontFamily={node.kind === "project" ? "var(--font-display)" : "var(--font-sans)"}
                  fill={node.kind === "missing" ? "var(--color-warm-ink)" : muted ? "var(--color-muted)" : "var(--color-ink)"}
                  stroke="var(--color-canvas)"
                  strokeWidth={4}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                >
                  {node.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
