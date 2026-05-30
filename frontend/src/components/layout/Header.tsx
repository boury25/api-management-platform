'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { CommandPalette } from '@/components/ui/CommandPalette';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const { user } = useAuthStore();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Open on ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3">

          {/* Left: hamburger (mobile) + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: search + bell + avatar */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Search trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-gray-400 text-sm cursor-pointer hover:bg-gray-200 transition-colors"
            >
              <Search size={15} />
              <span>Search...</span>
              <kbd className="text-xs bg-white rounded px-1.5 py-0.5 border border-gray-200 text-gray-400">
                ⌘K
              </kbd>
            </button>

            {/* Search icon only on small screens */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Search"
            >
              <Search size={18} />
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
            </button>

            {/* Avatar */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold uppercase">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 leading-none">{user?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
              </div>
            </div>
          </div>

        </div>
      </header>
    </>
  );
}
