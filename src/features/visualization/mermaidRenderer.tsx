import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import type { GraphData } from '../graph/graphTypes';
import { getEdgeSourceId, getEdgeTargetId, getSubgraph } from '../graph/graphUtils';
import { getNodeColor } from './d3Renderer';
import { AlertCircle, Copy, Check } from 'lucide-react';

// Initialize mermaid library for browser usage
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
});

/**
 * Escapes characters for Mermaid labels
 */
function escapeLabel(label: string): string {
  return label.replace(/"/g, '\\"').replace(/[[\]()]/g, '');
}

/**
 * Generates Mermaid flowchart syntax string from graph data
 */
export function generateMermaidCode(graphData: GraphData, activeNodeId: string | null): string {
  let nodes = graphData.nodes;
  let links = graphData.links;

  // If a node is active, focus only on its subgraph of dependencies and dependents
  if (activeNodeId) {
    const { nodeIds, edgeIds } = getSubgraph(activeNodeId, graphData, 'all');
    nodes = nodes.filter((n) => nodeIds.has(n.id));
    links = links.filter((l) => edgeIds.has(l.id));
  }

  // Cap size for readability in Mermaid
  if (nodes.length > 50) {
    // Return early with a message or limit nodes
    nodes = nodes.slice(0, 50);
    const nodeIds = new Set(nodes.map(n => n.id));
    links = links.filter(l => nodeIds.has(getEdgeSourceId(l)) && nodeIds.has(getEdgeTargetId(l)));
  }

  let code = 'graph TD\n';

  // 1. Declare nodes with styling brackets and labels
  nodes.forEach((n) => {
    // Replace colons/special symbols in IDs for Mermaid compliance
    const safeId = n.id.replace(/[^a-zA-Z0-9]/g, '_');
    
    let leftBracket = '[';
    let rightBracket = ']';
    
    if (n.type === 'directory') {
      leftBracket = '[/';
      rightBracket = '/]';
    } else if (n.type === 'package') {
      leftBracket = '((';
      rightBracket = '))';
    }

    const label = escapeLabel(n.label);
    code += `  ${safeId}${leftBracket}"${label}"${rightBracket}\n`;
  });

  // 2. Declare relationships
  links.forEach((l) => {
    const sId = getEdgeSourceId(l).replace(/[^a-zA-Z0-9]/g, '_');
    const tId = getEdgeTargetId(l).replace(/[^a-zA-Z0-9]/g, '_');
    
    if (l.type === 'contains') {
      code += `  ${sId} -.-> ${tId}\n`; // Dashed line for folder contains
    } else {
      code += `  ${sId} --> ${tId}\n`; // Arrow line for imports
    }
  });

  // 3. Declare node color styles
  nodes.forEach((n) => {
    const safeId = n.id.replace(/[^a-zA-Z0-9]/g, '_');
    const color = getNodeColor(n.type, n.label);
    code += `  style ${safeId} fill:#0f172a,stroke:${color},stroke-width:2px,color:#f8fafc\n`;
  });

  return code;
}

interface MermaidRendererProps {
  graphData: GraphData;
  activeNodeId: string | null;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ graphData, activeNodeId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const code = generateMermaidCode(graphData, activeNodeId);
  const isTruncated = graphData.nodes.length > 50;

  useEffect(() => {
    let active = true;
    
    async function renderDiagram() {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';
      setError(null);

      if (graphData.nodes.length === 0) return;

      try {
        const id = `mermaid-svg-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        
        if (active && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (active) {
          setError('Failed to render flowchart. Ensure the dependency loops are not overly complex.');
        }
      }
    }

    renderDiagram();

    return () => {
      active = false;
    };
  }, [code, graphData]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden glass-panel">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/60">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Flowchart Diagram (Mermaid.js)
        </span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition"
          title="Copy Mermaid Code"
        >
          {copied ? (
            <>
              <Check size={13} className="text-teal-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* Main container area */}
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center min-h-0 relative">
        {isTruncated && !activeNodeId && (
          <div className="absolute top-3 left-3 right-3 flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xxs text-amber-400">
            <AlertCircle size={14} className="shrink-0" />
            <span>Graph is large! Showing first 50 nodes. Select a node to isolate its dependencies.</span>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center text-center p-4 text-slate-400">
            <AlertCircle size={32} className="text-rose-500 mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="text-slate-500 italic text-sm">No data available to render flowchart.</div>
        ) : (
          <div 
            ref={containerRef} 
            className="w-full flex justify-center scale-95 origin-center [&>svg]:max-w-full [&>svg]:h-auto text-slate-100" 
          />
        )}
      </div>
    </div>
  );
};
export default MermaidRenderer;
