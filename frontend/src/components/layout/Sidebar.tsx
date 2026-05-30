'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  FolderOpen,
  Key,
  FileText,
  BarChart3,
  Server,
  Webhook,
  Shield,
  Settings,
  LogOut,
  Zap,
  ChevronRight,
  FlaskConical,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Overview',      href: '/dashboard',   icon: LayoutDashboard },
  { name: 'Projects',      href: '/projects',    icon: FolderOpen },
  { name: 'API Keys',      href: '/api-keys',    icon: Key },
  { name: 'Playground',    href: '/playground',  icon: FlaskConical },
  { name: 'Request Logs',  href: '/logs',        icon: FileText },
  { name: 'Analytics',     href: '/analytics',   icon: BarChart3 },
  { name: 'Mock Server',   href: '/mocks',       icon: Server },
  { name: 'Webhooks',      href: '/webhooks',    icon: Webhook },
  { name: 'OAuth Clients', href: '/oauth',       icon: Shield },
  { name: 'Settings',      href: '/settings',    icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <>
      {/* ── Desktop: always-visible fixed sidebar ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-gray-950 border-r border-gray-800">
        <SidebarContent
          pathname={pathname}
          user={user}
          onLogout={handleLogout}
          showClose={false}
          onClose={onClose}
        />
      </aside>

      {/* ── Mobile / tablet: slide-in drawer ── */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-40 w-72 flex flex-col bg-gray-950 border-r border-gray-800',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent
          pathname={pathname}
          user={user}
          onLogout={handleLogout}
          showClose
          onClose={onClose}
        />
      </aside>
    </>
  );
}

// ── Shared inner content ──────────────────────────────────────────────────────

interface ContentProps {
  pathname: string;
  user: { name?: string; role?: string } | null;
  onLogout: () => void;
  showClose: boolean;
  onClose: () => void;
}

function SidebarContent({ pathname, user, onLogout, showClose, onClose }: ContentProps) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm leading-none">API Platform</p>
          <p className="text-gray-400 text-xs mt-0.5">Management Dashboard</p>
        </div>
        {showClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800',
              )}
            >
              <item.icon
                size={18}
                className={cn(
                  'shrink-0',
                  isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300',
                )}
              />
              <span className="flex-1 truncate">{item.name}</span>
              {isActive && <ChevronRight size={14} className="text-white/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold uppercase">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-gray-500 text-xs truncate">{user?.role || 'DEVELOPER'}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <LogOut size={18} className="shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );
}
