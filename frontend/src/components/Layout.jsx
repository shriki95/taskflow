import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, LayoutDashboard, LogOut, ChevronDown, FolderKanban, KeyRound, Menu, X, GripVertical,
} from 'lucide-react';
import {
  DndContext, closestCenter, MouseSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../api/supabase';
import Avatar from './Avatar';
import ChangePasswordModal from './ChangePasswordModal';

function SortableProjectItem({ project, active }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.projectId });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-center gap-0.5 rounded-lg mb-0.5 group/item ${
        active ? 'bg-brand-accent/15' : 'hover:bg-app-card'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 pl-1.5 pr-0.5 py-2 text-slate-700 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover/item:opacity-100 transition touch-none"
      >
        <GripVertical size={12} />
      </button>
      <Link
        to={`/projects/${project.projectId}`}
        className={`flex items-center gap-2 px-2 py-2 text-sm transition flex-1 min-w-0 ${
          active ? 'text-brand-accent font-medium' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
        <span className="truncate">{project.name}</span>
      </Link>
    </div>
  );
}

function SidebarProjectList({ projects, onReorder, location }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = projects.findIndex((p) => p.projectId === active.id);
    const newIdx = projects.findIndex((p) => p.projectId === over.id);
    onReorder(arrayMove(projects, oldIdx, newIdx));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={projects.map((p) => p.projectId)} strategy={verticalListSortingStrategy}>
        {projects.map((p) => (
          <SortableProjectItem
            key={p.projectId}
            project={p}
            active={location.pathname === `/projects/${p.projectId}`}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const storageKey = user?.userId ? `sidebar-order-${user.userId}` : null;

  useEffect(() => {
    projectsApi.list().then(({ data }) => {
      const accepted = (data.projects || []).filter((p) => p.memberStatus === 'accepted');
      if (storageKey) {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (saved.length) {
          const sorted = [...accepted].sort((a, b) => {
            const ia = saved.indexOf(a.projectId);
            const ib = saved.indexOf(b.projectId);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
          });
          setProjects(sorted);
          return;
        }
      }
      setProjects(accepted);
    });
  }, [location.pathname, storageKey]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleReorder = (newOrder) => {
    setProjects(newOrder);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newOrder.map((p) => p.projectId)));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      <div className="px-4 py-4 border-b border-app-border flex items-center justify-between flex-shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-accent rounded-md flex items-center justify-center">
            <CheckSquare size={15} className="text-white" />
          </div>
          <span className="font-bold text-slate-100 text-sm">TaskFlow</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-slate-500 hover:text-slate-300 transition p-1"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <NavItem
          to="/dashboard"
          icon={<LayoutDashboard size={16} />}
          label="Home"
          active={location.pathname === '/dashboard'}
        />
        {projects.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider px-2 mb-1">
              Projects
            </p>
            <SidebarProjectList
              projects={projects}
              onReorder={handleReorder}
              location={location}
            />
          </div>
        )}
      </nav>

      <div className="border-t border-app-border p-3 flex-shrink-0">
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
                onClick={() => { setUserMenuOpen(false); setShowChangePassword(true); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-app-bg transition"
              >
                <KeyRound size={14} />
                Change password
              </button>
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
    </>
  );

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 bg-app-sidebar border-r border-app-border flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-app-sidebar border-r border-app-border flex flex-col lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-app-border bg-app-sidebar flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-slate-200 transition p-1 -ml-1"
          >
            <Menu size={22} />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-accent rounded-md flex items-center justify-center">
              <CheckSquare size={13} className="text-white" />
            </div>
            <span className="font-bold text-slate-100 text-sm">TaskFlow</span>
          </Link>
        </div>

        <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
      </div>

      <AnimatePresence>
        {showChangePassword && (
          <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
        )}
      </AnimatePresence>
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
