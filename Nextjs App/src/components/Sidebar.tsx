'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  onOpenNewGoal?: () => void;
}

export function Sidebar({ onOpenNewGoal }: SidebarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/', icon: 'home' },
    { label: 'My Goals', path: '/my-goals', icon: 'flag' },
    { label: 'Focus', path: '/focus', icon: 'center_focus_strong' },
    { label: 'Insights', path: '/insights', icon: 'insights' },
    { label: 'Dependency Map', path: '/dependency-map', icon: 'account_tree' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full py-4">
      <div className="flex flex-col gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 px-4 h-10">
          <img
            src="/logo.png"
            alt="Taskit Logo"
            className="w-8 h-8 rounded-xl object-contain shadow-xs"
          />
          <span className="text-xl font-bold text-primary tracking-tight">Taskit</span>
        </div>

        {/* New Goal CTA */}
        <div className="px-3">
          <button
            onClick={onOpenNewGoal}
            className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-primary-container text-on-primary font-semibold text-sm shadow-[0_1px_3px_rgba(32,43,38,0.08)] hover:bg-primary transition-all active:scale-[0.98] cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Goal</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 h-9 rounded-lg transition-colors text-sm font-medium ${
                  active
                    ? 'bg-surface-container-high text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    active ? 'text-primary' : 'text-outline'
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Workspace Switcher & Settings */}
      <div className="flex flex-col gap-1 px-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container/60 mb-2 cursor-pointer hover:bg-surface-container transition-colors">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="material-symbols-outlined text-[18px] text-primary">workspaces</span>
            <span className="text-xs font-semibold text-on-surface truncate">Personal Workspace</span>
          </div>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">unfold_more</span>
        </div>

        <Link
          href="/settings"
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-2.5 px-3 h-9 rounded-lg transition-colors text-sm font-medium ${
            pathname === '/settings'
              ? 'bg-surface-container-high text-primary font-semibold'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px] text-outline">settings</span>
          <span>Settings</span>
        </Link>

        <Link
          href="/support"
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-2.5 px-3 h-9 rounded-lg transition-colors text-sm font-medium ${
            pathname === '/support'
              ? 'bg-surface-container-high text-primary font-semibold'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px] text-outline">help_outline</span>
          <span>Help & Support</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-surface-container-low shadow-sm z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded-md text-on-surface hover:bg-surface-container"
            type="button"
            aria-label="Toggle navigation"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
          <img
            src="/logo.png"
            alt="Taskit Logo"
            className="w-7 h-7 rounded-lg object-contain shadow-xs"
          />
          <span className="font-bold text-primary">Taskit</span>
        </div>
        <button
          onClick={onOpenNewGoal}
          className="flex items-center gap-1 h-8 px-3 rounded-full bg-primary-container text-on-primary text-xs font-semibold"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Goal</span>
        </button>
      </div>

      {/* Mobile Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-64 h-full bg-surface-container-low shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-surface-container-low shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex-col justify-between">
        {navContent}
      </aside>
    </>
  );
}
