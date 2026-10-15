'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Lead Product Designer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to register account');
        return;
      }

      window.location.href = '/';
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] font-sans text-[#202B26] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <img
            src="/logo.png"
            alt="Taskit Logo"
            className="w-11 h-11 rounded-2xl object-contain shadow-sm"
          />
          <span className="text-2xl font-bold tracking-tight text-[#184330]">Taskit</span>
        </div>
        <h2 className="text-center text-xl font-bold text-[#202B26]">
          Create your execution workspace
        </h2>
        <p className="mt-1 text-center text-xs text-[#68736B]">
          Join Taskit to orchestrate your goals and execution roadmaps
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm rounded-2xl border border-[#E5E4DC]">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-[#ffdad6]/60 border border-[#ba1a1a]/20 text-[#ba1a1a] text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#202B26] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marcus Vance"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F6F2] border border-[#E5E4DC] text-sm text-[#202B26] placeholder-[#68736B]/60 focus:outline-none focus:ring-2 focus:ring-[#315B46]/30 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202B26] mb-1">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marcus@company.com"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F6F2] border border-[#E5E4DC] text-sm text-[#202B26] placeholder-[#68736B]/60 focus:outline-none focus:ring-2 focus:ring-[#315B46]/30 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202B26] mb-1">
                Role / Function
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Engineering Lead"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F6F2] border border-[#E5E4DC] text-sm text-[#202B26] placeholder-[#68736B]/60 focus:outline-none focus:ring-2 focus:ring-[#315B46]/30 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202B26] mb-1">
                Password (min. 6 characters)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F6F2] border border-[#E5E4DC] text-sm text-[#202B26] placeholder-[#68736B]/60 focus:outline-none focus:ring-2 focus:ring-[#315B46]/30 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#315B46] text-white text-sm font-semibold shadow-xs hover:bg-[#184330] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <span>Complete Registration</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#68736B]">
            <span>Already have an account? </span>
            <Link
              href="/login"
              className="font-bold text-[#315B46] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
