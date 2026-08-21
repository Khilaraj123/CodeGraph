import { create } from 'zustand';
import type { RepoFile, RepositoryMetadata, LoaderState } from './repositoryTypes';
import type { GraphData } from '../graph/graphTypes';
import { loadGithubRepository } from './loaders/githubLoader';
import { loadLocalFileList, loadLocalDirectory, loadZipFile } from './loaders/localLoader';
import { parseCode } from '../analysis/parser/babelParser';
import { resolveFileImports } from '../analysis/parser/importExtractor';
import { buildDependencyGraph } from '../graph/builders/graphBuilder';
import { detectCycles } from '../graph/graphUtils';

// Define the hardcoded Sample Repository
const SAMPLE_FILES: RepoFile[] = [
  {
    path: 'src/main.tsx',
    name: 'main.tsx',
    content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    size: 244,
    type: 'file',
  },
  {
    path: 'src/App.tsx',
    name: 'App.tsx',
    content: `import React, { useState } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import GraphView from './components/graph/GraphView';
import { calculateComplexity } from './utils/metrics';

export default function App() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  return (
    <div className="flex h-screen flex-col bg-slate-900 text-slate-100">
      <Header title="CodeGraph Workspace" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onSelect={setSelectedNode} />
        <main className="flex-1 relative">
          <GraphView activeNodeId={selectedNode} />
        </main>
      </div>
    </div>
  );
}`,
    size: 673,
    type: 'file',
  },
  {
    path: 'src/components/layout/Header.tsx',
    name: 'Header.tsx',
    content: `import React from 'react';
import { Settings, Github } from 'lucide-react';
import { useRepoStore } from '../../stores/repoStore';

export default function Header({ title }: { title: string }) {
  const reset = useRepoStore((state) => state.resetRepo);
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
      <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
        <span className="text-xl font-bold bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
          CodeGraph
        </span>
      </div>
      <h1 className="text-sm text-slate-400 font-medium">{title}</h1>
      <div className="flex items-center gap-4 text-slate-400">
        <Github size={20} className="hover:text-white cursor-pointer" />
        <Settings size={20} className="hover:text-white cursor-pointer" />
      </div>
    </header>
  );
}`,
    size: 890,
    type: 'file',
  },
  {
    path: 'src/components/layout/Sidebar.tsx',
    name: 'Sidebar.tsx',
    content: `import React from 'react';
import FileTree from '../repository/FileTree';
import NodeDetails from './NodeDetails';

export default function Sidebar({ onSelect }: { onSelect: (id: string | null) => void }) {
  return (
    <aside className="w-80 border-r border-slate-800 bg-slate-950 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <FileTree onSelect={onSelect} />
      </div>
      <div className="border-t border-slate-800 p-4 bg-slate-900">
        <NodeDetails />
      </div>
    </aside>
  );
}`,
    size: 472,
    type: 'file',
  },
  {
    path: 'src/components/repository/FileTree.tsx',
    name: 'FileTree.tsx',
    content: `import React from 'react';
import { Folder, File, Code2 } from 'lucide-react';
import { useRepoStore } from '../../stores/repoStore';

export default function FileTree({ onSelect }: { onSelect: (id: string | null) => void }) {
  const files = useRepoStore((state) => state.files);
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">File Explorer</h3>
      <div className="space-y-1">
        {files.map((file) => (
          <div 
            key={file.path} 
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 text-sm cursor-pointer text-slate-300"
            onClick={() => onSelect(\`file:\${file.path}\`)}
          >
            <Code2 size={16} className="text-teal-400" />
            <span className="truncate">{file.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}`,
    size: 785,
    type: 'file',
  },
  {
    path: 'src/components/layout/NodeDetails.tsx',
    name: 'NodeDetails.tsx',
    content: `import React from 'react';
import { useRepoStore } from '../../stores/repoStore';
import { getNeighbors } from '../../features/graph/graphUtils';

export default function NodeDetails() {
  const { selectedNodeId, graphData } = useRepoStore();
  
  if (!selectedNodeId) {
    return <div className="text-xs text-slate-500 italic">Select a node to inspect...</div>;
  }
  
  const neighbors = getNeighbors(selectedNodeId, graphData.links);
  
  return (
    <div className="space-y-2 text-sm">
      <div className="font-semibold truncate text-teal-400">{selectedNodeId}</div>
      <div className="text-xs text-slate-400">Neighbors: {neighbors.size} linked nodes</div>
    </div>
  );
}`,
    size: 610,
    type: 'file',
  },
  {
    path: 'src/components/graph/GraphView.tsx',
    name: 'GraphView.tsx',
    content: `import React, { useEffect, useRef } from 'react';
import { useRepoStore } from '../../stores/repoStore';
import { renderD3Graph } from '../../features/visualization/d3Renderer';

export default function GraphView({ activeNodeId }: { activeNodeId: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { graphData, setSelectedNodeId } = useRepoStore();

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear container
    containerRef.current.innerHTML = '';
    
    // Render graph
    renderD3Graph(containerRef.current, graphData, activeNodeId, (nodeId) => {
      setSelectedNodeId(nodeId);
    });
  }, [graphData, activeNodeId, setSelectedNodeId]);

  return (
    <div className="w-full h-full bg-slate-950" ref={containerRef} />
  );
}`,
    size: 720,
    type: 'file',
  },
  {
    path: 'src/utils/metrics.ts',
    name: 'metrics.ts',
    content: `export function calculateComplexity(code: string): number {
  const matches = code.match(/if|for|while|map|filter|forEach/g) || [];
  return matches.length + 1;
}

export function calculateLoc(code: string): number {
  return code.split('\\n').length;
}`,
    size: 232,
    type: 'file',
  },
  {
    path: 'src/index.css',
    name: 'index.css',
    content: `@import "tailwindcss";
body {
  margin: 0;
  background-color: #020617;
}`,
    size: 68,
    type: 'file',
  },
];

interface FilterOptions {
  excludeTestFiles: boolean;
  showDirectories: boolean;
  showPackages: boolean;
  graphLayout: 'force' | 'radial' | 'grid';
}

interface RepoStoreState {
  files: RepoFile[];
  metadata: RepositoryMetadata | null;
  loaderState: LoaderState;
  graphData: GraphData;
  cycles: string[][];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  githubToken: string;
  activeTab: 'home' | 'repository' | 'settings';

  // Actions
  setGithubToken: (token: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setHoveredNodeId: (id: string | null) => void;
  setActiveTab: (tab: 'home' | 'repository' | 'settings') => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  resetRepo: () => void;

  filters: FilterOptions;

  // Processing triggers
  processRepositoryFiles: (rawFiles: RepoFile[], metadata: RepositoryMetadata) => void;
  loadGithub: (repoUrl: string) => Promise<void>;
  loadFileList: (fileList: FileList) => Promise<void>;
  loadDirectoryHandle: (dirHandle: FileSystemDirectoryHandle) => Promise<void>;
  loadZip: (zipFile: File) => Promise<void>;
  loadSample: () => void;
}

export const useRepoStore = create<RepoStoreState>((set, get) => ({
  files: [],
  metadata: null,
  loaderState: {
    status: 'idle',
    message: '',
    progress: 0,
  },
  graphData: { nodes: [], links: [] },
  cycles: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  searchQuery: '',
  githubToken: localStorage.getItem('codegraph_github_token') || '',
  activeTab: 'home',

  filters: {
    excludeTestFiles: true,
    showDirectories: false,
    showPackages: true,
    graphLayout: 'force',
  },

  setGithubToken: (token) => {
    localStorage.setItem('codegraph_github_token', token);
    set({ githubToken: token });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setFilters: (updatedFilters) => {
    set((state) => {
      const newFilters = { ...state.filters, ...updatedFilters };
      // Re-trigger graph building when filters change
      let newGraph = state.graphData;
      let newCycles = state.cycles;

      if (state.files.length > 0) {
        newGraph = buildDependencyGraph(state.files, newFilters);
        newCycles = detectCycles(newGraph);
      }

      return {
        filters: newFilters,
        graphData: newGraph,
        cycles: newCycles,
      };
    });
  },

  resetRepo: () => {
    set({
      files: [],
      metadata: null,
      graphData: { nodes: [], links: [] },
      cycles: [],
      selectedNodeId: null,
      hoveredNodeId: null,
      loaderState: { status: 'idle', message: '', progress: 0 },
      activeTab: 'home',
    });
  },

  /**
   * Orchestrates the parsing, resolving, and graph building from raw file inputs
   */
  processRepositoryFiles: (rawFiles: RepoFile[], metadata: RepositoryMetadata) => {
    set({
      loaderState: { status: 'parsing', message: 'Parsing code syntax & generating ASTs...', progress: 10 },
    });

    const filePaths = rawFiles.map((f) => f.path);
    const parsedFiles: RepoFile[] = [];

    // 1. Parse AST structure for all files
    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const parseResult = parseCode(file.content, file.path);

      parsedFiles.push({
        ...file,
        imports: parseResult.imports,
        exports: parseResult.exports,
        classes: parseResult.classes,
        functions: parseResult.functions,
        lineCount: parseResult.lineCount,
      });

      if ((i + 1) % 5 === 0 || i === rawFiles.length - 1) {
        const percent = 10 + Math.round(((i + 1) / rawFiles.length) * 40); // Scaling up to 50%
        set({
          loaderState: {
            status: 'parsing',
            message: `Parsed ${i + 1}/${rawFiles.length} files...`,
            progress: percent,
          },
        });
      }
    }

    set({
      loaderState: { status: 'parsing', message: 'Resolving dependency import links...', progress: 60 },
    });

    // 2. Resolve relative path imports for all files
    for (let i = 0; i < parsedFiles.length; i++) {
      const file = parsedFiles[i];
      if (file.imports) {
        file.imports = resolveFileImports(file.imports, file.path, filePaths);
      }
    }

    set({
      loaderState: { status: 'parsing', message: 'Generating dependency graph layout...', progress: 80 },
    });

    // 3. Build graph nodes & edges
    const filters = get().filters;
    const graphData = buildDependencyGraph(parsedFiles, filters);

    // 4. Detect circular cycles
    set({
      loaderState: { status: 'parsing', message: 'Analyzing import cycles...', progress: 90 },
    });
    const cycles = detectCycles(graphData);

    set({
      files: parsedFiles,
      metadata,
      graphData,
      cycles,
      selectedNodeId: null,
      hoveredNodeId: null,
      loaderState: { status: 'success', message: 'Codebase analysis complete!', progress: 100 },
      activeTab: 'repository',
    });
  },

  loadGithub: async (repoUrl) => {
    set({ loaderState: { status: 'loading', message: 'Connecting to GitHub...', progress: 0 } });
    try {
      const token = get().githubToken;
      const { files, metadata } = await loadGithubRepository(repoUrl, token, (progress, message) => {
        set({ loaderState: { status: 'loading', message, progress } });
      });

      get().processRepositoryFiles(files, metadata);
    } catch (error: any) {
      set({
        loaderState: { status: 'error', message: error.message || 'Failed to load GitHub repository.', progress: 0 },
      });
    }
  },

  loadFileList: async (fileList) => {
    set({ loaderState: { status: 'loading', message: 'Preparing local upload...', progress: 0 } });
    try {
      const { files, metadata } = await loadLocalFileList(fileList, (progress, message) => {
        set({ loaderState: { status: 'loading', message, progress } });
      });

      get().processRepositoryFiles(files, metadata);
    } catch (error: any) {
      set({
        loaderState: { status: 'error', message: error.message || 'Failed to load local files.', progress: 0 },
      });
    }
  },

  loadDirectoryHandle: async (dirHandle) => {
    set({ loaderState: { status: 'loading', message: 'Opening local directory...', progress: 0 } });
    try {
      const { files, metadata } = await loadLocalDirectory(dirHandle, (progress, message) => {
        set({ loaderState: { status: 'loading', message, progress } });
      });

      get().processRepositoryFiles(files, metadata);
    } catch (error: any) {
      set({
        loaderState: { status: 'error', message: error.message || 'Failed to load folder.', progress: 0 },
      });
    }
  },

  loadZip: async (zipFile) => {
    set({ loaderState: { status: 'loading', message: 'Loading ZIP file...', progress: 0 } });
    try {
      const { files, metadata } = await loadZipFile(zipFile, (progress, message) => {
        set({ loaderState: { status: 'loading', message, progress } });
      });

      get().processRepositoryFiles(files, metadata);
    } catch (error: any) {
      set({
        loaderState: { status: 'error', message: error.message || 'Failed to extract ZIP archive.', progress: 0 },
      });
    }
  },

  loadSample: () => {
    const metadata: RepositoryMetadata = {
      name: 'Sample Workspace',
      source: 'sample',
      fileCount: SAMPLE_FILES.length,
      totalSize: SAMPLE_FILES.reduce((acc, f) => acc + f.size, 0),
    };

    // Copy sample files to avoid modifying template source
    const rawFiles = SAMPLE_FILES.map(f => ({ ...f }));
    get().processRepositoryFiles(rawFiles, metadata);
  },
}));
