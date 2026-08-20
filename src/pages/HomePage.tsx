import React, { useRef, useState } from 'react';
import { useRepoStore } from '../stores/repoStore';
import { FolderOpen, FileArchive, Play, Loader2, Key } from 'lucide-react';

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number }> = ({ size = 24, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export const HomePage: React.FC = () => {
  const {
    loaderState,
    loadGithub,
    loadFileList,
    loadDirectoryHandle,
    loadZip,
    loadSample,
    githubToken,
    setGithubToken,
  } = useRepoStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  const handleFolderClick = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        await loadDirectoryHandle(dirHandle);
      } else {
        fileInputRef.current?.click();
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        fileInputRef.current?.click();
      }
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadFileList(e.target.files);
    }
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadZip(e.target.files[0]);
    }
  };

  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (githubUrl.trim()) {
      loadGithub(githubUrl.trim());
    }
  };

  const isLoading = loaderState.status === 'loading' || loaderState.status === 'parsing';

  return (
    <div className="min-h-screen bg-glow-grid flex flex-col justify-center items-center px-4 py-12 relative select-none">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-4xl flex flex-col items-center relative z-10">
        {/* Header Title */}
        <div className="text-center mb-12">
          <span className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent glow-text-teal">
            CodeGraph
          </span>
          <p className="mt-3 text-lg text-slate-400 font-medium">
            Explore your codebase structure and dependencies in an interactive visual map
          </p>
        </div>

        {/* Action cards layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Card: Select Folder */}
          <div
            onClick={handleFolderClick}
            className="flex flex-col p-6 rounded-2xl glass-panel glass-panel-hover cursor-pointer transition-all duration-300 group"
          >
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl w-fit group-hover:scale-110 transition duration-300">
              <FolderOpen size={24} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-200">Load Local Folder</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Upload a folder from your local drive. Runs entirely in your browser. No files leave your device.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFolderChange}
              className="hidden"
              multiple
              {...{ webkitdirectory: '', directory: '' } as any}
            />
          </div>

          {/* Card: ZIP Archive */}
          <div
            onClick={() => zipInputRef.current?.click()}
            className="flex flex-col p-6 rounded-2xl glass-panel glass-panel-hover cursor-pointer transition-all duration-300 group"
          >
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit group-hover:scale-110 transition duration-300">
              <FileArchive size={24} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-200">Load ZIP Archive</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Upload a compressed codebase (.zip) archive. We'll unzip it and analyze it instantly.
            </p>
            <input
              type="file"
              ref={zipInputRef}
              onChange={handleZipChange}
              accept=".zip"
              className="hidden"
            />
          </div>

          {/* Form: GitHub Repo URL */}
          <div className="md:col-span-2 rounded-2xl glass-panel p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-fit">
                    <GithubIcon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-200">Load GitHub Repository</h3>
                </div>
                <button
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  <Key size={13} />
                  <span>{githubToken ? 'Configure Token' : 'Add Token'}</span>
                </button>
              </div>

              {showTokenInput && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="Enter Personal Access Token (PAT)..."
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded text-slate-200 outline-none"
                  />
                  <button
                    onClick={() => setShowTokenInput(false)}
                    className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-medium"
                  >
                    Done
                  </button>
                </div>
              )}

              <p className="mt-3 text-sm text-slate-400">
                Paste a public repository URL or type "owner/name" (e.g. <code>pmndrs/zustand</code>) to fetch.
              </p>
            </div>

            <form onSubmit={handleGithubSubmit} className="mt-4 flex gap-2">
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/pmndrs/zustand"
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-200 outline-none transition"
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold text-white transition active:scale-95 shadow-lg shadow-indigo-600/20"
              >
                Analyze
              </button>
            </form>
          </div>
        </div>

        {/* Sample playground trigger */}
        <div className="mt-8 text-center">
          <span className="text-xs text-slate-500 mr-2">Or check it out right away:</span>
          <button
            onClick={loadSample}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            <Play size={12} className="text-teal-400 fill-teal-400/20" />
            <span>Load Sample Codebase</span>
          </button>
        </div>
      </div>

      {/* Loader Overlay Modal */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl glass-panel text-center">
            <Loader2 className="mx-auto text-teal-400 animate-spin" size={40} />
            <h3 className="mt-6 text-lg font-bold text-slate-200">Analyzing Repository</h3>
            <p className="mt-2 text-sm text-slate-400 font-medium">{loaderState.message}</p>
            
            {/* Loading progress bar */}
            <div className="mt-6 w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${loaderState.progress}%` }}
              />
            </div>
            <span className="mt-2 block text-xxs text-slate-500 font-semibold">{loaderState.progress}% complete</span>
          </div>
        </div>
      )}

      {/* Error state alert overlay */}
      {!isLoading && loaderState.status === 'error' && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs shadow-lg animate-pulse-glow">
          <div className="font-bold mb-1">Analysis Error</div>
          <div>{loaderState.message}</div>
          <button
            onClick={loadSample}
            className="mt-2 text-xxs underline text-slate-400 hover:text-slate-200 transition"
          >
            Clear and load sample codebase instead
          </button>
        </div>
      )}
    </div>
  );
};
export default HomePage;
