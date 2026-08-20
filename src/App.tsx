import React from 'react';
import { useRepoStore } from './stores/repoStore';
import HomePage from './pages/HomePage';
import RepositoryPage from './pages/RepositoryPage';
import SettingsPage from './pages/SettingsPage';
import { Settings, Layout, Home, Network } from 'lucide-react';

const GithubIcon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number }> = ({ size = 24, ...props }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

function App() {
  const { activeTab, setActiveTab, metadata, resetRepo } = useRepoStore();

  // If on the home landing page, render HomePage directly without header wrapper
  if (activeTab === 'home') {
    return <HomePage />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Universal Workspace Header */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-6 shrink-0 z-30 select-none">
        {/* Logo and Brand */}
        <div
          onClick={resetRepo}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="p-1.5 bg-gradient-to-tr from-teal-500 to-indigo-500 rounded-lg text-white group-hover:scale-105 transition">
            <Network size={16} />
          </div>
          <span className="text-md font-bold bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent glow-text-teal">
            CodeGraph
          </span>
        </div>

        {/* Tab switcher links */}
        <nav className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            <Home size={14} />
            <span>Home</span>
          </button>

          {metadata && (
            <button
              onClick={() => setActiveTab('repository')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'repository'
                  ? 'bg-slate-900 text-teal-400 border border-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Layout size={14} />
              <span>Workspace</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'settings'
                ? 'bg-slate-900 text-teal-400 border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        </nav>

        {/* Quick Social links */}
        <div className="flex items-center gap-4 text-slate-400">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition"
          >
            <GithubIcon size={18} />
          </a>
        </div>
      </header>

      {/* Main Page Workspace View */}
      <main className="flex-1 min-h-0 relative">
        {activeTab === 'repository' && <RepositoryPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
