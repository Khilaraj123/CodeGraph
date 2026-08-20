import React, { useState, useEffect, useRef } from 'react';
import { useRepoStore } from '../stores/repoStore';
import { renderD3Graph } from '../features/visualization/d3Renderer';
import { MermaidRenderer } from '../features/visualization/mermaidRenderer';
import { exportToSvg, exportToPng, exportToJson } from '../features/visualization/export';
import {
  Folder,
  File,
  Search,
  Download,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Boxes,
  FileCode,
} from 'lucide-react';


// Tree node definition
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: Map<string, TreeNode>;
}

// Tree builder
function buildFileTree(filePaths: string[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', type: 'directory', children: new Map() };

  for (const path of filePaths) {
    const parts = path.split('/');
    let current = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: currentPath,
          type: isLast ? 'file' : 'directory',
          children: new Map(),
        });
      }
      current = current.children.get(part)!;
    }
  }

  return root;
}

export const RepositoryPage: React.FC = () => {
  const {
    files,
    metadata,
    graphData,
    cycles,
    selectedNodeId,
    setSelectedNodeId,
    filters,
    setFilters,
  } = useRepoStore();

  const [activeTab, setActiveTab] = useState<'d3' | 'mermaid'>('d3');
  const [fileSearch, setFileSearch] = useState('');
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  
  const d3ContainerRef = useRef<HTMLDivElement>(null);
  const filePaths = files.map((f) => f.path);
  const fileMap = new Map(files.map((f) => [f.path, f]));
  const fileTree = buildFileTree(filePaths);

  // Initialize and update D3 Graph layout
  useEffect(() => {
    if (activeTab !== 'd3' || !d3ContainerRef.current) return;
    
    // Clear old drawings
    d3ContainerRef.current.innerHTML = '';
    
    // Trigger render
    renderD3Graph(
      d3ContainerRef.current,
      graphData,
      selectedNodeId,
      (nodeId) => {
        setSelectedNodeId(nodeId);
      },
      filters.graphLayout
    );
  }, [graphData, selectedNodeId, filters.graphLayout, activeTab, setSelectedNodeId]);

  // Handle collapsible directories
  const toggleDir = (dirPath: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  // Filtered files in tree explorer
  const matchFileSearch = (node: TreeNode): boolean => {
    if (node.type === 'file') {
      return node.name.toLowerCase().includes(fileSearch.toLowerCase());
    }
    for (const child of node.children.values()) {
      if (matchFileSearch(child)) return true;
    }
    return false;
  };

  // Render collapsible File Explorer Tree recursively
  const renderTreeNodes = (node: TreeNode, depth = 0) => {
    const sorted = Array.from(node.children.values()).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return sorted.map((child) => {
      if (child.type === 'directory') {
        if (fileSearch && !matchFileSearch(child)) return null;

        const isCollapsed = collapsedDirs.has(child.path);
        return (
          <div key={child.path} className="select-none">
            <div
              onClick={() => toggleDir(child.path)}
              className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-slate-800 text-xs font-medium text-slate-300 cursor-pointer transition"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <Folder size={14} className="text-indigo-400 fill-indigo-400/10 shrink-0" />
              <span className="truncate">{child.name}</span>
            </div>
            {!isCollapsed && renderTreeNodes(child, depth + 1)}
          </div>
        );
      } else {
        if (fileSearch && !child.name.toLowerCase().includes(fileSearch.toLowerCase())) {
          return null;
        }

        const nodeId = `file:${child.path}`;
        const isSelected = selectedNodeId === nodeId;

        return (
          <div
            key={child.path}
            onClick={() => setSelectedNodeId(isSelected ? null : nodeId)}
            className={`flex items-center gap-2 py-1 px-2 rounded text-xs cursor-pointer transition truncate ${
              isSelected ? 'bg-indigo-600/30 text-white font-bold' : 'hover:bg-slate-800 text-slate-400'
            }`}
            style={{ paddingLeft: `${depth * 12 + 20}px` }}
          >
            <File size={13} className={isSelected ? 'text-teal-400' : 'text-slate-500'} />
            <span className="truncate">{child.name}</span>
          </div>
        );
      }
    });
  };

  // Get active node metadata if a node is selected
  const activeFile = selectedNodeId?.startsWith('file:')
    ? fileMap.get(selectedNodeId.replace(/^file:/, ''))
    : null;

  // Handle graph export downloads
  const handleExport = (format: 'svg' | 'png' | 'json') => {
    if (!metadata) return;
    const svgElement = d3ContainerRef.current?.querySelector('svg');
    if (format === 'json') {
      exportToJson(graphData, `${metadata.name}_graph`);
    } else if (svgElement) {
      if (format === 'svg') {
        exportToSvg(svgElement, `${metadata.name}_graph`);
      } else {
        exportToPng(svgElement, `${metadata.name}_graph`);
      }
    }
  };

  // Select node by clicking detail list items
  const selectGraphNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* 1. LEFT SIDEBAR: File explorer */}
      <div className="w-72 border-r border-slate-800 bg-slate-950 flex flex-col shrink-0 min-w-0">
        {/* Search Files */}
        <div className="p-4 border-b border-slate-800 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-xs outline-none text-slate-200 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Tree List container */}
        <div className="flex-grow overflow-y-auto p-3 space-y-1">
          {renderTreeNodes(fileTree)}
        </div>
      </div>

      {/* 2. CENTER PANEL: Visual workbench */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative h-full">
        {/* Floating Top Header bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 capitalize bg-slate-900 px-2 py-1 rounded">
              {metadata?.source} repository
            </span>
            <span className="text-sm font-semibold text-slate-200">{metadata?.name}</span>
          </div>

          {/* Toggle Tab View */}
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('d3')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                activeTab === 'd3' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Interactive Graph
            </button>
            <button
              onClick={() => setActiveTab('mermaid')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                activeTab === 'mermaid' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Flowchart
            </button>
          </div>

          {/* Floating Actions */}
          <div className="flex items-center gap-2">
            {activeTab === 'd3' && (
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold rounded-lg text-slate-300 transition">
                  <Download size={13} />
                  <span>Export</span>
                </button>
                <div className="absolute right-0 top-8 mt-1 hidden group-hover:block bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 w-32 z-35 text-xs">
                  <button
                    onClick={() => handleExport('svg')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition"
                  >
                    Export as SVG
                  </button>
                  <button
                    onClick={() => handleExport('png')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition"
                  >
                    Export as PNG
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition"
                  >
                    Export as JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Display visualizer canvas */}
        <div className="flex-1 min-h-0 relative z-10 w-full h-full">
          {activeTab === 'd3' ? (
            <div className="w-full h-full relative">
              {/* Force physics layout configuration quick selectors */}
              <div className="absolute bottom-4 left-6 z-25 flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-lg backdrop-blur">
                <button
                  onClick={() => setFilters({ graphLayout: 'force' })}
                  className={`px-2 py-1 text-xxs font-medium rounded-md transition ${
                    filters.graphLayout === 'force' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Force Layout
                </button>
                <button
                  onClick={() => setFilters({ graphLayout: 'radial' })}
                  className={`px-2 py-1 text-xxs font-medium rounded-md transition ${
                    filters.graphLayout === 'radial' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Radial Layout
                </button>
                <button
                  onClick={() => setFilters({ graphLayout: 'grid' })}
                  className={`px-2 py-1 text-xxs font-medium rounded-md transition ${
                    filters.graphLayout === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Grid Layout
                </button>
              </div>

              {/* D3 Canvas container */}
              <div ref={d3ContainerRef} className="w-full h-full bg-slate-950" />
            </div>
          ) : (
            <div className="w-full h-full p-6">
              <MermaidRenderer graphData={graphData} activeNodeId={selectedNodeId} />
            </div>
          )}
        </div>
      </div>

      {/* 3. RIGHT PANEL: Details inspector */}
      <div className="w-80 border-l border-slate-800 bg-slate-950 flex flex-col shrink-0 min-w-0">
        <div className="p-4 border-b border-slate-800 shrink-0">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analysis Inspector</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* STATE A: Detailed File Selected */}
          {activeFile ? (
            <div className="space-y-5">
              {/* File Summary */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wide">
                  <FileCode size={12} />
                  <span>File Details</span>
                </div>
                <h4 className="text-md font-bold text-slate-100 truncate" title={activeFile.name}>
                  {activeFile.name}
                </h4>
                <p className="text-xxs font-mono text-slate-500 truncate" title={activeFile.path}>
                  {activeFile.path}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-slate-900/60 border border-slate-850 rounded-lg text-xs">
                  <div>
                    <span className="block text-slate-500 text-xxs font-medium">Lines of Code</span>
                    <span className="font-bold text-slate-200">{activeFile.lineCount}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-xxs font-medium">File Size</span>
                    <span className="font-bold text-slate-200">{(activeFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              </div>

              {/* Internal Structures (Classes & Functions) */}
              {((activeFile.classes && activeFile.classes.length > 0) ||
                (activeFile.functions && activeFile.functions.length > 0)) && (
                <div className="space-y-2">
                  <div className="text-xxs font-semibold text-slate-500 uppercase tracking-wider">
                    Defined Structures
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-900/30 rounded border border-slate-850">
                    {activeFile.classes?.map((c) => (
                      <div key={c.name} className="text-xs text-indigo-300 font-mono flex items-center gap-1.5">
                        <span className="text-indigo-400 font-bold shrink-0">class</span>
                        <span className="truncate">{c.name}</span>
                        {c.superClass && (
                          <span className="text-slate-500 text-xxs truncate">extends {c.superClass}</span>
                        )}
                      </div>
                    ))}
                    {activeFile.functions?.map((f) => (
                      <div key={f.name} className="text-xs text-teal-300 font-mono flex items-center gap-1.5">
                        <span className="text-teal-400 shrink-0 font-bold">fn</span>
                        <span className="truncate">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Imports List */}
              <div className="space-y-2">
                <div className="text-xxs font-semibold text-slate-500 uppercase tracking-wider">
                  Imports ({activeFile.imports?.length || 0})
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {activeFile.imports && activeFile.imports.length > 0 ? (
                    activeFile.imports.map((imp, idx) => (
                      <div
                        key={idx}
                        onClick={() => imp.resolvedPath && selectGraphNode(`file:${imp.resolvedPath}`)}
                        className={`p-2 rounded border border-slate-850 hover:bg-slate-900/80 transition text-xs font-mono truncate ${
                          imp.resolvedPath ? 'cursor-pointer border-indigo-950 text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        <div className="truncate" title={imp.source}>
                          {imp.source}
                        </div>
                        {imp.resolvedPath && (
                          <div className="text-xxs text-indigo-400 font-sans truncate mt-0.5">
                            → {imp.resolvedPath.split('/').pop()}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xxs text-slate-600 italic">No imports found in this file.</div>
                  )}
                </div>
              </div>

              {/* Dependents list */}
              <div className="space-y-2">
                <div className="text-xxs font-semibold text-slate-500 uppercase tracking-wider">
                  Dependents (Imported By)
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {(() => {
                    const dependents = files.filter((f) =>
                      f.imports?.some((imp) => imp.resolvedPath === activeFile.path)
                    );
                    return dependents.length > 0 ? (
                      dependents.map((dep) => (
                        <div
                          key={dep.path}
                          onClick={() => selectGraphNode(`file:${dep.path}`)}
                          className="p-2 rounded border border-slate-850 hover:bg-slate-900 border-indigo-950 text-slate-300 cursor-pointer transition text-xs font-mono truncate"
                        >
                          <div className="truncate" title={dep.name}>
                            {dep.name}
                          </div>
                          <div className="text-xxs text-slate-500 font-sans truncate mt-0.5">
                            {dep.path}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xxs text-slate-600 italic">No files import this module.</div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : selectedNodeId?.startsWith('pkg:') ? (
            /* STATE B: Package Node Selected */
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-orange-400 font-semibold uppercase tracking-wide">
                  <Boxes size={12} />
                  <span>External Package</span>
                </div>
                <h4 className="text-md font-bold text-slate-100 truncate">
                  {selectedNodeId.replace(/^pkg:/, '')}
                </h4>
              </div>

              <div className="space-y-2">
                <div className="text-xxs font-semibold text-slate-500 uppercase tracking-wider">
                  Imported By
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5">
                  {(() => {
                    const pkgName = selectedNodeId.replace(/^pkg:/, '');
                    const importers = files.filter((f) =>
                      f.imports?.some((imp) => {
                        if (imp.resolvedPath) return false;
                        return imp.source.startsWith(pkgName);
                      })
                    );

                    return importers.length > 0 ? (
                      importers.map((imp) => (
                        <div
                          key={imp.path}
                          onClick={() => selectGraphNode(`file:${imp.path}`)}
                          className="p-2 rounded border border-slate-850 hover:bg-slate-900 border-indigo-950 text-slate-300 cursor-pointer transition text-xs font-mono truncate"
                        >
                          <div className="truncate">{imp.name}</div>
                          <div className="text-xxs text-slate-500 font-sans truncate mt-0.5">
                            {imp.path}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xxs text-slate-600 italic">No files import this package.</div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            /* STATE C: No Node Selected, Display Repository Overview */
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-teal-400 font-semibold uppercase tracking-wide">
                  <BookOpen size={12} />
                  <span>Repository Overview</span>
                </div>
                <h4 className="text-md font-bold text-slate-100">{metadata?.name}</h4>
              </div>

              {/* Stats Card */}
              <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-850 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-slate-500 text-xxs font-medium">Source Files</span>
                  <span className="font-bold text-slate-200 text-md">{metadata?.fileCount}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xxs font-medium">Total Size</span>
                  <span className="font-bold text-slate-200 text-md">
                    {(((metadata?.totalSize || 0) / 1024)).toFixed(1)} KB
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-slate-500 text-xxs font-medium">Active Graph Nodes</span>
                  <span className="font-bold text-slate-200">{graphData.nodes.length}</span>
                </div>
              </div>

              {/* Circular import cycle detector list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xxs font-semibold text-slate-500 uppercase tracking-wider">
                    Circular Cycles ({cycles.length})
                  </div>
                  {cycles.length > 0 && (
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2">
                  {cycles.length > 0 ? (
                    cycles.map((cycle, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-xxs space-y-1"
                      >
                        <div className="font-bold text-amber-400">Import Cycle #{idx + 1}</div>
                        <div className="text-slate-400 font-mono space-y-0.5 pl-1.5 border-l border-amber-500/20">
                          {cycle.map((nodeId, cIdx) => {
                            const name = nodeId.replace(/^file:/, '').split('/').pop() || '';
                            const isLast = cIdx === cycle.length - 1;
                            return (
                              <div
                                key={cIdx}
                                onClick={() => selectGraphNode(nodeId)}
                                className="hover:text-amber-300 cursor-pointer truncate"
                                title={nodeId}
                              >
                                {cIdx > 0 && <span className="text-slate-600 mr-1">→</span>}
                                <span className={isLast ? 'font-bold' : ''}>{name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xxs text-slate-600 italic">No circular import loops detected! Your architecture is clean.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default RepositoryPage;
