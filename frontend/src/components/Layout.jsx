import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import {
  CheckSquare, LayoutDashboard, LogOut, ChevronDown, FolderKanban,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../api/supabase';
import Avatar from './Avatar';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    projectsApi.list().then(({ data }) => setProjects(data.projects));
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-app-sidebar border-r border-app-border flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-app-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-accent rounded-md flex items-center justify-center">
              <CheckSquare size={15} className="text-white" />
            </div>
            <span className="font-bold text-slate-100 text-sm">TaskFlow</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <NavItem
            to="/dashboard"
            icon={<LayoutDashboard size={16} />}
            label="Home"
            active={location.pathname === '/dashboard'}
          />

          {/* Projects section */}
          {projects.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider px-2 mb-1">
                Projects
              </p>
              {projects.map((p) => (
                <NavItem
                  key={p.projectId}
                  to={`/projects/${p.projectId}`}
                  icon={
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                  }
                  label={p.name}
                  active={location.pathname === `/projects/${p.projectId}`}
                />
              ))}
            </div>
          )}
        </nav>

        {/* User menu */}
        <div className="border-t border-app-border p-3">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-app-card transition"
          >
            <Avatar name={user?.name} color={user?.avatar_color} size="sm" />
            <span className="flex-1 text-left text-sm font-medium text-slate-300 truncate">
              {user?.name}
            </span>
            <ChevronDown
              size={14}
              className={`text-slate-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-1 bg-app-card border border-app-border rounded-lg overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-app-border">
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}

function NavItem({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition mb-0.5 ${
        active
          ? 'bg-brand-accent/15 text-brand-accent font-medium'
          : 'text-slate-400 hover:text-slate-200 hover:bg-app-card'
      }`}
    >
      <span className={active ? 'text-brand-accent' : 'text-slate-500'}>{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
