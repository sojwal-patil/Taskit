'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { loadUserCached } from '@/lib/client-store';

interface HeaderProps {
  onSearch?: (term: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [todayFormatted, setTodayFormatted] = useState('');
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    role?: string;
    avatar?: string;
  } | null>(null);

  useEffect(() => {
    setTodayFormatted(
      new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Kolkata',
      }).format(new Date())
    );
    loadUserCached().then((user) => {
      if (user) setCurrentUser(user);
    });
  }, []);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'Deadline at Risk',
      message: 'Mobile App MVP TestFlight closed release is due this Friday.',
      type: 'warning',
      time: '10m ago',
      unread: true,
      href: '/my-goals',
    },
    {
      id: 'n2',
      title: 'Recovery Plan Recommended',
      message: 'Critical path delayed by 3.5 days on Apple Privacy Manifest.',
      type: 'error',
      time: '1h ago',
      unread: true,
      href: '/insights',
    },
    {
      id: 'n3',
      title: 'Focus Sprint Target',
      message: 'You have completed 3 of 4 planned deep work sessions today.',
      type: 'info',
      time: '3h ago',
      unread: false,
      href: '/focus',
    },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <header className="fixed top-0 left-0 lg:left-60 right-0 h-16 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] z-30 flex items-center justify-between px-4 lg:px-6 mt-14 lg:mt-0">
      {/* Search Input Bar with ⌘K Badge */}
      <div className="flex items-center gap-3 w-64 sm:w-80 md:w-96">
        <div className="flex items-center w-full h-10 px-3 rounded-lg bg-surface-container-lowest shadow-[0_1px_3px_rgba(32,43,38,0.04)] text-on-surface-variant focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <span className="material-symbols-outlined text-[18px] mr-2 text-outline">search</span>
          <input
            type="text"
            placeholder="Search projects, tasks, milestones..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="flex-1 bg-transparent border-none text-sm text-on-surface placeholder:text-outline focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] font-semibold">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls: Date, Notifications, Profile */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 text-on-surface-variant text-xs font-semibold">
          <span className="material-symbols-outlined text-[18px] text-outline">calendar_today</span>
          <span>{todayFormatted}</span>
        </div>

        <div className="h-4 w-px bg-surface-variant hidden md:block"></div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              if (profileDropdownOpen) setProfileDropdownOpen(false);
            }}
            className="relative p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            type="button"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error ring-2 ring-surface"></span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest rounded-2xl shadow-xl border border-[#E5E4DC] p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container px-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-on-surface">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-error-container text-on-error-container">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5 py-2 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => {
                      setNotificationsOpen(false);
                      setNotifications((prev) =>
                        prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
                      );
                    }}
                    className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${
                      n.unread ? 'bg-surface-container-low/70 hover:bg-surface-container' : 'hover:bg-surface-container/50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        n.type === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : n.type === 'error'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-primary-fixed text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {n.type === 'warning' ? 'warning' : n.type === 'error' ? 'error' : 'bolt'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface truncate">{n.title}</span>
                        <span className="text-[10px] text-outline">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">{n.message}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="relative">
          <div
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 pl-1 cursor-pointer rounded-full hover:bg-surface-container transition-colors py-1 pr-2 select-none"
          >
            {currentUser?.avatar ? (
              <img
                alt={currentUser?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-border-crisp"
                src={currentUser.avatar}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#315B46] text-white flex items-center justify-center font-bold text-xs ring-1 ring-border-crisp">
                {currentUser?.name
                  ? currentUser.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'U'}
              </div>
            )}
            <span className="hidden sm:inline-block text-xs font-semibold text-on-surface">
              {currentUser?.name ? currentUser.name.split(' ')[0] : 'Account'}
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">keyboard_arrow_down</span>
          </div>

          {/* Profile Dropdown */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-lg border border-[#E5E4DC] p-2 z-50">
              <div className="px-3 py-2 border-b border-surface-container">
                <p className="text-xs font-bold text-on-surface">
                  {currentUser?.name || 'Authenticated User'}
                </p>
                <p className="text-[11px] text-on-surface-variant truncate">
                  {currentUser?.email || 'user@workspace.com'}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-container text-primary">
                  {currentUser?.role || 'Member'} • Workspace
                </span>
              </div>
              <div className="pt-1">
                <Link
                  href="/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">settings</span>
                  <span>Workspace Settings</span>
                </Link>
                <Link
                  href="/support"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">help_outline</span>
                  <span>Help & Support</span>
                </Link>
                <Link
                  href="/focus"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">center_focus_strong</span>
                  <span>Start Focus Session</span>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    window.location.href = '/login';
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-error hover:bg-error-container/40 transition-colors cursor-pointer text-left"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
