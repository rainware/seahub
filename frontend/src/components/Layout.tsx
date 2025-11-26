import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
      ? 'bg-sky-100 text-sky-700 border-r-4 border-sky-500 font-semibold'
      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50';
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 fixed h-full glass-panel z-50 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="text-2xl font-bold bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
            Seahub
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-1">
          <Link to="/actions" className={`flex items-center px-6 py-3 transition-all duration-200 ${isActive('/actions')}`}>
            <span className="font-medium">Actions</span>
          </Link>
          <Link to="/dags" className={`flex items-center px-6 py-3 transition-all duration-200 ${isActive('/dags')}`}>
            <span className="font-medium">DAGs</span>
          </Link>
          <Link to="/tasks" className={`flex items-center px-6 py-3 transition-all duration-200 ${isActive('/tasks')}`}>
            <span className="font-medium">Tasks</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="text-xs text-slate-400 text-center">
            Seahub v1.0
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        {/* Header (Mobile only or Breadcrumbs) */}
        <header className="h-16 glass sticky top-0 z-40 flex items-center px-6 md:hidden">
          <div className="text-xl font-bold text-sky-500">Seahub</div>
        </header>

        <div className="p-6 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
