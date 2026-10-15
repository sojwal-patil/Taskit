'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { UserSettings } from '@/lib/types';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'PROFILE' | 'SECURITY' | 'FOCUS' | 'AI' | 'NOTIFICATIONS'>('PROFILE');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [timezone, setTimezone] = useState('India Standard Time (IST) UTC+05:30');
  const [focusDuration, setFocusDuration] = useState(25);
  const [shortBreak, setShortBreak] = useState(5);
  const [longBreak, setLongBreak] = useState(15);
  const [dailyTarget, setDailyTarget] = useState(4);
  const [aiModel, setAiModel] = useState('openai/gpt-oss-120b');
  const [autoRecoveryThreshold, setAutoRecoveryThreshold] = useState(3);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [scheduleAlerts, setScheduleAlerts] = useState(true);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }
      setPasswordSuccess('Password successfully updated! Your credentials are secure.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Error updating password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.name) setName(data.name);
          if (data.email) setEmail(data.email);
          if (data.role) setRole(data.role);
          if (data.timezone) setTimezone(data.timezone);
          if (data.focusDurationMins) setFocusDuration(data.focusDurationMins);
          if (data.shortBreakMins) setShortBreak(data.shortBreakMins);
          if (data.longBreakMins) setLongBreak(data.longBreakMins);
          if (data.dailySessionTarget) setDailyTarget(data.dailySessionTarget);
          if (data.aiModelPreference) setAiModel(data.aiModelPreference);
          if (data.autoRecoveryThreshold) setAutoRecoveryThreshold(data.autoRecoveryThreshold);
          if (data.emailNotifications !== undefined) setEmailAlerts(data.emailNotifications);
          if (data.scheduleAlerts !== undefined) setScheduleAlerts(data.scheduleAlerts);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          timezone,
          focusDurationMins: focusDuration,
          shortBreakMins: shortBreak,
          longBreakMins: longBreak,
          dailySessionTarget: dailyTarget,
          aiModelPreference: aiModel,
          autoRecoveryThreshold,
          emailNotifications: emailAlerts,
          scheduleAlerts,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased">
      <Sidebar />
      <div className="lg:pl-60">
        <Header />

        <main className="relative pt-16 bg-surface min-h-screen pb-24">
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1240px] mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-surface-container">
              <div>
                <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">
                  <span>Preferences</span>
                  <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                  <span className="text-primary font-bold">Workspace Settings</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">Settings</h1>
                <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
                  Manage your account preferences, focus cadence, AI planning settings, and workspace defaults.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-xs font-semibold text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  Auto-sync active
                </span>
              </div>
            </div>

            {/* Layout Grid: Sub-navigation alongside Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Sub-Navigation Rail */}
              <nav className="lg:col-span-3 flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 sticky top-20 z-10">
                <button
                  type="button"
                  onClick={() => setActiveSection('PROFILE')}
                  className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeSection === 'PROFILE'
                      ? 'bg-surface-container text-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">account_circle</span>
                    <span>Profile & Account</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('SECURITY')}
                  className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeSection === 'SECURITY'
                      ? 'bg-surface-container text-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                    <span>Security & Password</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('FOCUS')}
                  className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeSection === 'FOCUS'
                      ? 'bg-surface-container text-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">timer</span>
                    <span>Focus & Cadence</span>
                  </span>
                  <span className="text-[10px] bg-primary-fixed text-primary px-1.5 py-0.5 rounded">Smart</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('AI')}
                  className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeSection === 'AI'
                      ? 'bg-surface-container text-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                    <span>Adaptive Planning Engine</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('NOTIFICATIONS')}
                  className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    activeSection === 'NOTIFICATIONS'
                      ? 'bg-surface-container text-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                    <span>Alerts & Deviations</span>
                  </span>
                </button>

                <div className="mt-4 p-4 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                    <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    <span>Personal Workspace</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    Settings persist across all active goals, roadmaps, and focus sessions in your workspace.
                  </p>
                </div>
              </nav>

              {/* Main Settings Form Panels */}
              <form onSubmit={handleSave} className="lg:col-span-9 flex flex-col gap-6">
                {/* SECTION 1: User Profile & Identity */}
                {activeSection === 'PROFILE' && (
                  <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-[#E5E4DC] flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                      <div>
                        <h2 className="text-base font-bold text-on-surface">User Profile & Identity</h2>
                        <p className="text-xs text-on-surface-variant">
                          Update your credentials and workspace localization.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container text-primary">
                        Pro Seat
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-surface-container-low">
                      <div className="w-16 h-16 rounded-full bg-[#315B46] text-white flex items-center justify-center font-bold text-xl ring-2 ring-[#315B46]">
                        {name
                          ? name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()
                          : 'U'}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-on-surface">{name || 'User Profile'}</h3>
                        <p className="text-xs text-on-surface-variant">{role || 'Member'} • Workspace</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">Work Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">Job Role / Title</label>
                        <input
                          type="text"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">Timezone</label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer font-medium"
                        >
                          <option>India Standard Time (IST) UTC+05:30</option>
                          <option>Pacific Time (US & Canada) UTC-07:00</option>
                          <option>Eastern Time (US & Canada) UTC-04:00</option>
                          <option>Central European Time (Berlin) UTC+01:00</option>
                          <option>Singapore Time (SGT) UTC+08:00</option>
                          <option>Greenwich Mean Time (London) UTC+00:00</option>
                        </select>
                      </div>
                    </div>
                  </section>
                )}

                {/* SECTION: Security & Password */}
                {activeSection === 'SECURITY' && (
                  <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-[#E5E4DC] flex flex-col gap-5">
                    <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                      <div>
                        <h2 className="text-base font-bold text-on-surface">Security & Authentication</h2>
                        <p className="text-xs text-on-surface-variant">
                          Update your master password and manage workspace security credentials.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-fixed/70 text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">shield</span>
                        <span>Secured</span>
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                        <span className="material-symbols-outlined text-primary text-[18px]">key</span>
                        <span>Change Account Password</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Ensure your account uses a strong password with at least 6 characters. Passwords are securely hashed with bcrypt.
                      </p>

                      {passwordError && (
                        <div className="p-3 rounded-lg bg-error-container/40 text-error text-xs flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">error</span>
                          <span>{passwordError}</span>
                        </div>
                      )}

                      {passwordSuccess && (
                        <div className="p-3 rounded-lg bg-primary-fixed/40 text-primary text-xs flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          <span>{passwordSuccess}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-4 max-w-lg">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-on-surface">Current Password</label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter your current password"
                            className="h-10 px-3 rounded-lg bg-surface-container-lowest border border-[#E5E4DC] text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-on-surface">New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            className="h-10 px-3 rounded-lg bg-surface-container-lowest border border-[#E5E4DC] text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-on-surface">Confirm New Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            className="h-10 px-3 rounded-lg bg-surface-container-lowest border border-[#E5E4DC] text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handlePasswordChange}
                            disabled={passwordSaving}
                            className="h-9 px-5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                          >
                            {passwordSaving ? (
                              <>
                                <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                                <span>Updating Password...</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[16px]">lock</span>
                                <span>Update Password</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* SECTION 2: Focus & Timer Defaults */}
                {activeSection === 'FOCUS' && (
                  <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-[#E5E4DC] flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                      <div>
                        <h2 className="text-base font-bold text-on-surface">Focus Session & Cadence Defaults</h2>
                        <p className="text-xs text-on-surface-variant">
                          Configure default sprint durations, breaks, and daily targets.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">Focus Sprint Duration (minutes)</label>
                        <input
                          type="number"
                          min={5}
                          max={120}
                          value={focusDuration}
                          onChange={(e) => setFocusDuration(parseInt(e.target.value) || 25)}
                          className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">Short Break (minutes)</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={shortBreak}
                          onChange={(e) => setShortBreak(parseInt(e.target.value) || 5)}
                          className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">Long Break (minutes)</label>
                        <input
                          type="number"
                          min={5}
                          max={60}
                          value={longBreak}
                          onChange={(e) => setLongBreak(parseInt(e.target.value) || 15)}
                          className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">Daily Sprint Target</label>
                        <input
                          type="number"
                          min={1}
                          max={16}
                          value={dailyTarget}
                          onChange={(e) => setDailyTarget(parseInt(e.target.value) || 4)}
                          className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </section>
                )}

                {/* SECTION 3: Adaptive Planning Engine */}
                {activeSection === 'AI' && (
                  <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-[#E5E4DC] flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                      <div>
                        <h2 className="text-base font-bold text-on-surface">Adaptive Planning Engine</h2>
                        <p className="text-xs text-on-surface-variant">
                          Configure intelligent roadmap synthesis and schedule recovery thresholds.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">Roadmap Planning Mode</label>
                        <select
                          value={aiModel}
                          onChange={(e) => setAiModel(e.target.value)}
                          className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        >
                          <option value="openai/gpt-oss-120b">Deep Strategic Breakdown (Recommended)</option>
                          <option value="qwen/qwen3.8-27b">Balanced Execution Flow</option>
                          <option value="openai/gpt-oss-20b">Rapid Lightweight Sprint</option>
                          <option value="llama-3.3-70b-versatile">Structured Milestone Framework</option>
                        </select>
                        <span className="text-[11px] text-outline">
                          Controls the level of breakdown, milestone depth, and task granularity for generated roadmaps.
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-on-surface">
                          Auto-Recovery Proposal Threshold (days of slip)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={14}
                          value={autoRecoveryThreshold}
                          onChange={(e) => setAutoRecoveryThreshold(parseInt(e.target.value) || 3)}
                          className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-[11px] text-outline">
                          Automatically generates proposed recovery trade-offs when critical path slips by this duration.
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                {/* SECTION 4: Alerts & Notifications */}
                {activeSection === 'NOTIFICATIONS' && (
                  <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-[#E5E4DC] flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                      <div>
                        <h2 className="text-base font-bold text-on-surface">Alerts & Schedule Deviations</h2>
                        <p className="text-xs text-on-surface-variant">
                          Toggle alerts when milestone blockers arise.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low cursor-pointer">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">Critical Path Blocker Alerts</span>
                          <span className="text-[11px] text-on-surface-variant">
                            Notify immediately when an upstream prerequisite delays a release candidate.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={scheduleAlerts}
                          onChange={(e) => setScheduleAlerts(e.target.checked)}
                          className="w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low cursor-pointer">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">Weekly Executive Summary</span>
                          <span className="text-[11px] text-on-surface-variant">
                            Receive Friday summaries of focus hours logged and milestones hit.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={emailAlerts}
                          onChange={(e) => setEmailAlerts(e.target.checked)}
                          className="w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer"
                        />
                      </label>
                    </div>
                  </section>
                )}

                {/* Save Feedback & Controls */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    {saveSuccess && (
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5 animate-fadeIn">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Settings successfully saved & persisted!</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="h-10 px-6 rounded-lg bg-primary-container text-on-primary text-xs font-semibold shadow-xs hover:bg-primary transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
