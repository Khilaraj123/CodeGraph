import * as d3 from 'd3';
import type { GraphData, GraphNode, GraphEdge, NodeType } from '../graph/graphTypes';
import { getEdgeSourceId, getEdgeTargetId } from '../graph/graphUtils';

// Helper to determine color based on node type / file extension
export function getNodeColor(type: NodeType, label: string): string {
  if (type === 'directory') return '#818cf8'; // Indigo
  if (type === 'package') return '#fb923c';   // Orange
  
  const ext = label.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
      return '#2dd4bf'; // Teal
    case 'ts':
      return '#3b82f6'; // Blue
    case 'jsx':
      return '#facc15'; // Yellow
    case 'js':
      return '#fb7185'; // Rose
    case 'css':
      return '#ec4899'; // Pink
    case 'json':
      return '#a855f7'; // Purple
    case 'md':
      return '#34d399'; // Emerald
    default:
      return '#94a3b8'; // Slate
  }
}

// Helper to determine size for node icon
function getNodeIcon(type: NodeType, label: string): string {
  if (type === 'directory') return '📁';
  if (type === 'package') return '📦';
  
  const ext = label.split('.').pop()?.toLowerCase();
  if (ext === 'tsx' || ext === 'jsx') return '⚛️';
  if (ext === 'css') return '🎨';
  if (ext === 'json') return '⚙️';
  if (ext === 'md') return '📝';
  return '📄';
}

/**
 * Main function to render the interactive graph canvas inside a container element.
 */
export function renderD3Graph(
  container: HTMLDivElement,
  graphData: GraphData,
  activeNodeId: string | null,
  onSelectNode: (nodeId: string | null) => void,
  layout: 'force' | 'radial' | 'grid' = 'force'
) {
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;

  // 1. Create SVG Element
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'hidden');

  // Add filters for premium glow effects
  const defs = svg.append('defs');
  
  // Marker arrow for links
  defs
    .append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 22) // Place arrow head at edge of node
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#475569');

  // Filter for glowing node effects
  const glow = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  glow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
  const merge = glow.append('feMerge');
  merge.append('feMergeNode').attr('in', 'blur');
  merge.append('feMergeNode').attr('in', 'SourceGraphic');

  // Create tooltip div
  const tooltip = d3
    .select(container)
    .append('div')
    .attr('class', 'graph-tooltip')
    .style('opacity', 0);

  // Group for zooming/panning
  const g = svg.append('g').attr('class', 'graph-content');

  // 2. Clone Graph Data (D3 mutates nodes/links)
  const nodes: GraphNode[] = graphData.nodes.map((n) => ({ ...n }));
  const links: GraphEdge[] = graphData.links.map((l) => ({
    ...l,
    source: l.source,
    target: l.target,
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Connect links to matching cloned node objects
  links.forEach((l) => {
    const sId = getEdgeSourceId(l);
    const tId = getEdgeTargetId(l);
    l.source = nodeMap.get(sId) || sId;
    l.target = nodeMap.get(tId) || tId;
  });

  // 3. Zoom behavior
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  // 4. Render Links
  const link = g
    .append('g')
    .selectAll('path')
    .data(links)
    .enter()
    .append('path')
    .attr('stroke', '#334155')
    .attr('stroke-width', (d) => (d.type === 'contains' ? 1.5 : 1))
    .attr('stroke-dasharray', (d) => (d.type === 'contains' ? '3,3' : 'none'))
    .attr('fill', 'none')
    .attr('marker-end', (d) => (d.type === 'import' ? 'url(#arrow)' : 'none'))
    .style('transition', 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s');

  // 5. Render Nodes
  const node = g
    .append('g')
    .selectAll('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .style('cursor', 'pointer');

  // Add background circle for nodes
  node
    .append('circle')
    .attr('r', (d) => (d.type === 'directory' ? 18 : d.type === 'package' ? 15 : 12))
    .attr('fill', '#0f172a')
    .attr('stroke', (d) => getNodeColor(d.type, d.label))
    .attr('stroke-width', 2)
    .attr('class', 'node-circle')
    .style('filter', (d) => (d.id === activeNodeId ? 'url(#glow)' : 'none'))
    .style('transition', 'stroke-width 0.2s, filter 0.2s');

  // Add textual emojis/icons in node center
  node
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.33em')
    .attr('font-size', (d) => (d.type === 'directory' ? '12px' : '10px'))
    .text((d) => getNodeIcon(d.type, d.label));

  // Add text label below node
  node
    .append('text')
    .attr('dx', 0)
    .attr('dy', (d) => (d.type === 'directory' ? 26 : 20))
    .attr('text-anchor', 'middle')
    .attr('fill', '#94a3b8')
    .attr('font-size', '10px')
    .attr('font-weight', (d) => (d.id === activeNodeId ? 'bold' : 'normal'))
    .style('pointer-events', 'none')
    .text((d) => d.label)
    .style('transition', 'fill 0.2s, font-weight 0.2s');

  // Highlight connections
  const neighborIds = new Set<string>();
  if (activeNodeId) {
    neighborIds.add(activeNodeId);
    links.forEach((l) => {
      const sId = (l.source as GraphNode).id;
      const tId = (l.target as GraphNode).id;
      if (sId === activeNodeId) neighborIds.add(tId);
      if (tId === activeNodeId) neighborIds.add(sId);
    });

    // Dim unrelated items
    node.style('opacity', (d) => (neighborIds.has(d.id) ? 1 : 0.25));
    link
      .attr('stroke', (d) => {
        const sId = (d.source as GraphNode).id;
        const tId = (d.target as GraphNode).id;
        if (sId === activeNodeId || tId === activeNodeId) {
          return getNodeColor((d.target as GraphNode).type, (d.target as GraphNode).label);
        }
        return '#334155';
      })
      .attr('stroke-width', (d) => {
        const sId = (d.source as GraphNode).id;
        const tId = (d.target as GraphNode).id;
        return sId === activeNodeId || tId === activeNodeId ? 2 : 1;
      })
      .style('opacity', (d) => {
        const sId = (d.source as GraphNode).id;
        const tId = (d.target as GraphNode).id;
        return sId === activeNodeId || tId === activeNodeId ? 1 : 0.15;
      });
  }

  // 6. Interactive Events
  node
    .on('mouseover', (event, d) => {
      // Scale element slightly
      d3.select(event.currentTarget).select('.node-circle').attr('stroke-width', 4);
      
      // Update opacity highlight if no active node is locked
      if (!activeNodeId) {
        const hoverNeighbors = new Set<string>([d.id]);
        links.forEach((l) => {
          const sId = (l.source as GraphNode).id;
          const tId = (l.target as GraphNode).id;
          if (sId === d.id) hoverNeighbors.add(tId);
          if (tId === d.id) hoverNeighbors.add(sId);
        });

        node.style('opacity', (n) => (hoverNeighbors.has(n.id) ? 1 : 0.2));
        link.style('opacity', (l) => {
          const sId = (l.source as GraphNode).id;
          const tId = (l.target as GraphNode).id;
          return sId === d.id || tId === d.id ? 1 : 0.1;
        });
      }

      // Show tooltip
      let sizeInfo = '';
      if (d.type === 'file') {
        sizeInfo = `<br/>Lines of code: <b>${Math.round(d.size)}</b>`;
      }
      
      tooltip
        .style('opacity', 1)
        .html(`
          <div class="font-bold text-slate-100">${d.label}</div>
          <div class="text-xs text-slate-400 capitalize">${d.type}</div>
          ${d.path ? `<div class="text-xxs text-slate-500 mt-1 font-mono">${d.path}</div>` : ''}
          ${sizeInfo}
        `)
        .style('left', `${event.pageX + 12}px`)
        .style('top', `${event.pageY - 12}px`);
    })
    .on('mousemove', (event) => {
      tooltip
        .style('left', `${event.pageX + 12}px`)
        .style('top', `${event.pageY - 12}px`);
    })
    .on('mouseout', (event) => {
      // Revert border
      d3.select(event.currentTarget)
        .select('.node-circle')
        .attr('stroke-width', 2);

      // Restore opacities
      if (!activeNodeId) {
        node.style('opacity', 1);
        link.attr('stroke', '#334155').attr('stroke-width', (d) => (d.type === 'contains' ? 1.5 : 1)).style('opacity', 1);
      } else {
        node.style('opacity', (n) => (neighborIds.has(n.id) ? 1 : 0.25));
        link
          .attr('stroke', (l) => {
            const sId = (l.source as GraphNode).id;
            const tId = (l.target as GraphNode).id;
            return sId === activeNodeId || tId === activeNodeId ? getNodeColor((l.target as GraphNode).type, (l.target as GraphNode).label) : '#334155';
          })
          .attr('stroke-width', (l) => {
            const sId = (l.source as GraphNode).id;
            const tId = (l.target as GraphNode).id;
            return sId === activeNodeId || tId === activeNodeId ? 2 : 1;
          })
          .style('opacity', (l) => {
            const sId = (l.source as GraphNode).id;
            const tId = (l.target as GraphNode).id;
            return sId === activeNodeId || tId === activeNodeId ? 1 : 0.15;
          });
      }

      tooltip.style('opacity', 0);
    })
    .on('click', (event, d) => {
      event.stopPropagation();
      onSelectNode(d.id === activeNodeId ? null : d.id);
    });

  // Clicking empty SVG canvas resets selection
  svg.on('click', () => {
    onSelectNode(null);
  });

  // 7. Layout Computations
  if (layout === 'force') {
    // Enable D3 physics forces
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphEdge>(links)
          .id((d) => d.id)
          .distance((d) => (d.type === 'contains' ? 50 : 100))
      )
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d: any) => (d.type === 'directory' ? 30 : 20)));

    // Drag behavior for nodes (only active in force mode)
    node.call(
      d3
        .drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    // Ticks simulation
    simulation.on('tick', () => {
      link.attr('d', (d) => {
        const s = d.source as GraphNode;
        const t = d.target as GraphNode;
        const sx = s.x || 0;
        const sy = s.y || 0;
        const tx = t.x || 0;
        const ty = t.y || 0;

        if (d.type === 'contains') {
          // Straight lines for containment relationships
          return `M${sx},${sy}L${tx},${ty}`;
        }
        
        // Curved paths for dependency arrows to avoid overlap in bilateral imports
        const dx = tx - sx;
        const dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
      });

      node.attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`);
    });
  } else if (layout === 'grid') {
    // Place nodes in rectangular grid rows and columns
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const cellWidth = width / (cols + 1);
    const cellHeight = height / (Math.ceil(nodes.length / cols) + 1);

    nodes.forEach((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      d.x = cellWidth * (col + 1);
      d.y = cellHeight * (row + 1);
    });

    // Render layout statically
    link.attr('d', (d) => {
      const s = d.source as GraphNode;
      const t = d.target as GraphNode;
      return `M${s.x || 0},${s.y || 0}L${t.x || 0},${t.y || 0}`;
    });
    node.attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`);
  } else if (layout === 'radial') {
    // Concentric radial circles layout
    const radiusStep = Math.min(width, height) / 3;
    const center = { x: width / 2, y: height / 2 };

    nodes.forEach((d) => {
      // Group ring index based on type hierarchy
      let ring = 2;
      if (d.type === 'directory') ring = 0;
      else if (d.type === 'package') ring = 1;

      const ringNodes = nodes.filter((n) => {
        if (ring === 0) return n.type === 'directory';
        if (ring === 1) return n.type === 'package';
        return n.type !== 'directory' && n.type !== 'package';
      });

      const ringIndex = ringNodes.indexOf(d);
      const ringCount = ringNodes.length;

      const angle = (ringIndex / (ringCount || 1)) * 2 * Math.PI;
      const currentRadius = (ring + 1) * (radiusStep / 3);

      d.x = center.x + currentRadius * Math.cos(angle);
      d.y = center.y + currentRadius * Math.sin(angle);
    });

    // Render layout statically
    link.attr('d', (d) => {
      const s = d.source as GraphNode;
      const t = d.target as GraphNode;
      return `M${s.x || 0},${s.y || 0}L${t.x || 0},${t.y || 0}`;
    });
    node.attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`);
  }
}
