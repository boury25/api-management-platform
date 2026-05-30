'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, FolderOpen, Key, FileText, BarChart3, Server, Webhook, Shield, Settings } from 'lucide-react';

const commands = [
  { name: 'Overview',      href: '/dashboard',  icon: LayoutDashboard, group: 'Navigation' },
  { name: 'Projects',      href: '/projects',   icon: FolderOpen,      group: 'Navigation' },
  { name: 'API Keys',      href: '/api-keys',   icon: Key,             group: 'Navigation' },
  { name: 'Request Logs',  href: '/logs',       icon: FileText,        group: 'Navigation' },
  { name: 'Analytics',     href: '/analytics',  icon: BarChart3,       group: 'Navigation' },
  { name: 'Mock Server',   href: '/mocks',      icon: Server,          group: 'Navigation' },
  { name: 'Webhooks',      href: '/webhooks',   icon: Webhook,         group: 'Navigation' },
  { name: 'OAuth Clients', href: '/oauth',      icon: Shield,          group: 'Navigation' },
  { name: 'Settings',      href: '/settings',   icon: Settings,        group: 'Navigation' },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? commands.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : commands;

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose],
  );

  // Focus input when opened; reset state when closed
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Reset active index when filtered list changes
  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[active]) navigate(filtered[active].href);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, active, filtered, navigate, onClose]);

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl ring-1 ring-gray-200 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline text-xs bg-gray-100 rounded px-1.5 py-0.5 border border-gray-200 text-gray-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ul className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-gray-400">No results</li>
          ) : (
            filtered.map((cmd, i) => (
              <li key={cmd.href}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); navigate(cmd.href); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                    i === active ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <cmd.icon
                    size={16}
                    className={`shrink-0 ${i === active ? 'text-brand-600' : 'text-gray-400'}`}
                  />
                  <span className="font-medium">{cmd.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
