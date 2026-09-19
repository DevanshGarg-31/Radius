import { CollaborationGraph, type GraphEdge, type GraphNode } from "./CollaborationGraph";

/**
 * The landing-page composition: people connect to skills, skills connect to an
 * idea, and one hollow node waits for the person the idea still needs.
 * Hand-placed on purpose; it is an illustration, not live data.
 */
const NODES: GraphNode[] = [
  { id: "idea", label: "Your idea", kind: "project", x: 270, y: 228 },
  { id: "ml", label: "Machine Learning", kind: "skill", x: 168, y: 142, labelPosition: "above" },
  { id: "cv", label: "Computer Vision", kind: "skill", x: 392, y: 150, labelPosition: "above" },
  { id: "py", label: "Python", kind: "skill", x: 150, y: 318, labelPosition: "left" },
  { id: "react", label: "React", kind: "skill", x: 372, y: 330, labelPosition: "right" },
  { id: "football", label: "Football", kind: "interest", x: 282, y: 84, labelPosition: "above" },
  { id: "aarav", label: "Aarav", kind: "person", x: 52, y: 214, seed: "u001" },
  { id: "rahul", label: "Rahul", kind: "person", x: 198, y: 40, seed: "u002", labelPosition: "right" },
  { id: "priya", label: "Priya", kind: "person", x: 262, y: 408, seed: "u003" },
  { id: "next", label: "Who's next?", kind: "missing", x: 486, y: 250 },
];

const EDGES: GraphEdge[] = [
  { from: "aarav", to: "py" },
  { from: "aarav", to: "idea", tone: "strong" },
  { from: "rahul", to: "ml" },
  { from: "rahul", to: "football" },
  { from: "priya", to: "py" },
  { from: "priya", to: "react" },
  { from: "ml", to: "idea" },
  { from: "cv", to: "idea" },
  { from: "py", to: "idea" },
  { from: "react", to: "idea" },
  { from: "football", to: "idea" },
  { from: "cv", to: "next", tone: "missing" },
];

export function HeroGraph() {
  return <CollaborationGraph nodes={NODES} edges={EDGES} width={540} height={450} title="People connected through skills and interests to an idea, with one open place for the next collaborator" />;
}
