import type { GraphEdge, GraphData } from './graphTypes';

/**
 * Resolves the source or target ID from a link, supporting both string IDs and resolved D3 node objects.
 */
export function getEdgeSourceId(edge: GraphEdge): string {
  return typeof edge.source === 'object' ? edge.source.id : edge.source;
}

export function getEdgeTargetId(edge: GraphEdge): string {
  return typeof edge.target === 'object' ? edge.target.id : edge.target;
}

/**
 * Returns direct neighbors (both incoming and outgoing) of a given node
 */
export function getNeighbors(nodeId: string, links: GraphEdge[]): Set<string> {
  const neighbors = new Set<string>();
  
  for (const link of links) {
    const sourceId = getEdgeSourceId(link);
    const targetId = getEdgeTargetId(link);
    
    if (sourceId === nodeId) {
      neighbors.add(targetId);
    } else if (targetId === nodeId) {
      neighbors.add(sourceId);
    }
  }
  
  return neighbors;
}

/**
 * Traverses graph recursively to get a subgraph of dependencies, dependents, or both.
 */
export function getSubgraph(
  centerNodeId: string,
  graph: GraphData,
  direction: 'dependencies' | 'dependents' | 'all'
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>([centerNodeId]);
  const edgeIds = new Set<string>();
  
  const visitQueue: string[] = [centerNodeId];
  const visited = new Set<string>();

  // Map to speed up traversal lookups
  const outgoingMap = new Map<string, GraphEdge[]>();
  const incomingMap = new Map<string, GraphEdge[]>();

  for (const link of graph.links) {
    const s = getEdgeSourceId(link);
    const t = getEdgeTargetId(link);
    
    if (!outgoingMap.has(s)) outgoingMap.set(s, []);
    outgoingMap.get(s)!.push(link);
    
    if (!incomingMap.has(t)) incomingMap.set(t, []);
    incomingMap.get(t)!.push(link);
  }

  while (visitQueue.length > 0) {
    const curr = visitQueue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);

    // Get links to follow based on direction
    const linksToProcess: GraphEdge[] = [];
    
    if (direction === 'dependencies' || direction === 'all') {
      linksToProcess.push(...(outgoingMap.get(curr) || []));
    }
    
    if (direction === 'dependents' || direction === 'all') {
      linksToProcess.push(...(incomingMap.get(curr) || []));
    }

    for (const link of linksToProcess) {
      const s = getEdgeSourceId(link);
      const t = getEdgeTargetId(link);
      
      nodeIds.add(s);
      nodeIds.add(t);
      edgeIds.add(link.id);

      const nextNode = s === curr ? t : s;
      if (!visited.has(nextNode)) {
        visitQueue.push(nextNode);
      }
    }
  }

  return { nodeIds, edgeIds };
}

/**
 * Detects import cycles (circular dependencies) in the graph using DFS.
 * Returns lists of paths that form cycles.
 */
export function detectCycles(graph: GraphData): string[][] {
  const adjList = new Map<string, string[]>();
  
  // Construct adjacency list (only following 'import' edges)
  for (const link of graph.links) {
    if (link.type !== 'import') continue;
    const s = getEdgeSourceId(link);
    const t = getEdgeTargetId(link);
    
    if (!adjList.has(s)) adjList.set(s, []);
    adjList.get(s)!.push(t);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        // Cycle detected, extract the path from the stack
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cyclePath = path.slice(cycleStartIndex);
          cyclePath.push(neighbor); // Complete the loop visually
          cycles.push(cyclePath);
        }
      }
    }

    path.pop();
    recStack.delete(node);
  }

  // Run DFS from all unvisited nodes
  for (const node of graph.nodes) {
    if (node.type === 'file' && !visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return cycles;
}
