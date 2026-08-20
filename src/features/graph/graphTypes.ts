import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export type NodeType = 'file' | 'directory' | 'class' | 'function' | 'package';
export type EdgeType = 'import' | 'contains' | 'calls' | 'inherits';

export interface GraphNode extends SimulationNodeDatum {
  id: string;          // Unique ID, e.g. "file:src/App.tsx", "pkg:react", "class:src/App.tsx:App"
  label: string;       // Display label, e.g. "App.tsx", "react", "App"
  type: NodeType;      // Node classification
  path?: string;       // File system path (only for files & directories)
  size: number;        // Weight/size for visual scale (e.g., lines of code or file size)
  cluster?: string;    // Directory path or package category for grouping
}

export interface GraphEdge extends SimulationLinkDatum<GraphNode> {
  id: string;          // E.g. "sourceId->targetId"
  source: string | GraphNode;
  target: string | GraphNode;
  type: EdgeType;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}
