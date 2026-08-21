import React from 'react';
import { useRepoStore } from '../features/repository/repoStore';
import { Settings, Sliders, Layout, Info, RefreshCw } from 'lucide-react';

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number }> = ({ size = 24, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export const SettingsPage: React.FC = () => {
  const { filters, setFilters, githubToken, setGithubToken, resetRepo } = useRepoStore();

  const handleCheckboxChange = (key: keyof typeof filters) => {
    setFilters({ [key]: !filters[key] });
  };

  const handleLayoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ graphLayout: e.target.value as any });
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex justify-center select-none">
      <div className="w-full max-w-3xl space-y-6">
        {/* Title bar */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <Settings size={28} className="text-teal-400" />
          <h2 className="text-2xl font-bold text-slate-100">Workspace Settings</h2>
        </div>

        {/* 1. Layout Options Card */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 glass-panel space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-semibold border-b border-slate-800 pb-2">
            <Layout size={18} className="text-teal-400" />
            <span>Visualization Layout</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium">Layout Style</label>
            <select
              value={filters.graphLayout}
              onChange={handleLayoutChange}
              className="w-full md:w-72 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 outline-none focus:border-indigo-500 transition"
            >
              <option value="force">Force-Directed Simulation</option>
              <option value="radial">Concentric Radial Rings</option>
              <option value="grid">Rectangular Grid Coordinates</option>
            </select>
            <p className="text-xxs text-slate-500 leading-relaxed mt-1">
              - <b>Force-Directed:</b> Uses spring physics forces (best for understanding relations).<br />
              - <b>Concentric Radial:</b> Arranges nodes in outer rings based on directory containment.<br />
              - <b>Grid:</b> Places all nodes statically in rows and columns.
            </p>
          </div>
        </div>

        {/* 2. Graph Filter Controls Card */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 glass-panel space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-semibold border-b border-slate-800 pb-2">
            <Sliders size={18} className="text-indigo-400" />
            <span>Dependency Filter Preferences</span>
          </div>

          <div className="space-y-3">
            {/* Filter: Exclude Test files */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.excludeTestFiles}
                onChange={() => handleCheckboxChange('excludeTestFiles')}
                className="mt-1 w-4 h-4 bg-slate-950 border border-slate-800 rounded checked:bg-indigo-500 outline-none"
              />
              <div>
                <span className="text-sm font-medium text-slate-200 group-hover:text-white transition">Exclude Test Files</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filters out files containing <code>.test.</code>, <code>.spec.</code>, or nested inside <code>__tests__/</code> directory.
                </p>
              </div>
            </label>

            {/* Filter: Show directories */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.showDirectories}
                onChange={() => handleCheckboxChange('showDirectories')}
                className="mt-1 w-4 h-4 bg-slate-950 border border-slate-800 rounded checked:bg-indigo-500 outline-none"
              />
              <div>
                <span className="text-sm font-medium text-slate-200 group-hover:text-white transition">Render Directory Containment</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Injects directory nodes and draws dashed paths enclosing files to visualize folder hierarchies.
                </p>
              </div>
            </label>

            {/* Filter: Show packages */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.showPackages}
                onChange={() => handleCheckboxChange('showPackages')}
                className="mt-1 w-4 h-4 bg-slate-950 border border-slate-800 rounded checked:bg-indigo-500 outline-none"
              />
              <div>
                <span className="text-sm font-medium text-slate-200 group-hover:text-white transition">Include NPM Package Modules</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Includes external npm package references (e.g. <code>react</code>, <code>d3</code>) as terminal nodes in the graph.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* 3. GitHub API credentials Card */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 glass-panel space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-semibold border-b border-slate-800 pb-2">
            <GithubIcon size={18} className="text-slate-200" />
            <span>GitHub Credentials</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium">Personal Access Token (PAT)</label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-sm text-slate-200 outline-none transition"
            />
            <div className="flex gap-2 p-3 bg-slate-950 rounded-lg text-xxs text-slate-500 mt-2 leading-relaxed">
              <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Adding a token increases GitHub REST API rate limits from 60 to 5000 requests per hour. This enables analyzing large repositories and private repositories. The token is saved locally in your browser storage and is never uploaded.
              </span>
            </div>
          </div>
        </div>

        {/* 4. Utilities Reset */}
        <div className="flex justify-between items-center p-6 rounded-xl border border-slate-800 bg-rose-950/10">
          <div>
            <h4 className="text-sm font-bold text-rose-400">Reset Repository Workspace</h4>
            <p className="text-xs text-slate-400 mt-0.5">Clears currently analyzed files, metadata, and resets settings.</p>
          </div>
          <button
            onClick={resetRepo}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600/20 hover:bg-rose-600 hover:text-white border border-rose-600/30 text-rose-400 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Reset Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
