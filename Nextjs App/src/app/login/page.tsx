'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your credentials.');
        return;
      }

      // Hard redirect to ensure cookies are sent with HTTP headers to Next.js server & middleware
      window.location.href = from || '/';
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] font-sans text-[#202B26] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo & Header */}
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <img
            src="/logo.png"
            alt="Taskit Logo"
            className="w-11 h-11 rounded-2xl object-contain shadow-sm"
          />
          <span className="text-2xl font-bold tracking-tight text-[#184330]">Taskit</span>
        </div>
        <h2 className="text-center text-xl font-bold text-[#202B26]">
          Sign in to your execution workspace
        </h2>
        <p className="mt-1 text-center text-xs text-[#68736B]">
          Adaptive Goal Engine & Strategic Roadmaps
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
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F6F2] border border-[#E5E4DC] text-sm text-[#202B26] placeholder-[#68736B]/60 focus:outline-none focus:ring-2 focus:ring-[#315B46]/30 focus:bg-white transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#202B26]">
                  Password
                </label>
              </div>
              <input
                type="password"
                required
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
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#68736B]">
            <span>Don&apos;t have an account? </span>
            <Link
              href="/signup"
              className="font-bold text-[#315B46] hover:underline"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center text-sm text-[#68736B]">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
