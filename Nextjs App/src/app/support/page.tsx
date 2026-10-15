'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function SupportPage() {
  const supportEmail = 'sojwalpatil2006@gmail.com';
  const [copied, setCopied] = useState(false);
  const [inquiryCategory, setInquiryCategory] = useState('Technical Support');
  const [inquirySubject, setInquirySubject] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryMessage.trim()) return;
    setSubmitted(true);
    // Open user's email client as well with prefilled template
    const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(
      `[${inquiryCategory}] ${inquirySubject || 'Support Inquiry'}`
    )}&body=${encodeURIComponent(inquiryMessage)}`;
    window.open(mailtoUrl, '_blank');
  };

  const faqs = [
    {
      q: 'How does Taskit adaptively handle slipped deadlines?',
      a: 'When an upstream prerequisite or task exceeds its estimated duration, Taskit recalculates your critical path. If the slip crosses your recovery threshold (configurable in Settings), an intelligent Recovery Plan is generated offering concrete trade-offs like scope deferral or milestone re-pacing.',
    },
    {
      q: 'How do I adjust a goal’s target date or reschedule milestones?',
      a: 'Inside any Goal Workspace, click "Adjust Date" next to the target completion date in the top summary. Choose your new deadline, and Taskit will automatically rebalance your milestone phases and timeline proportionally.',
    },
    {
      q: 'How do I change my account password?',
      a: 'Navigate to Settings from the sidebar, click the "Security & Password" tab, enter your current password along with your new password (at least 6 characters), and click "Update Password".',
    },
    {
      q: 'Is my data private and securely stored?',
      a: 'Yes. All user sessions are authenticated via encrypted HTTP-only JWTs. Passwords are salted and hashed using bcrypt. Your workspace data is isolated by user ownership checks on every database transaction.',
    },
    {
      q: 'What should I do if I need custom assistance or report a bug?',
      a: `Directly reach out to our dedicated support email at ${supportEmail}. Our engineering team typically responds within 24 hours with resolution steps.`,
    },
  ];

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased">
      <Sidebar />
      <div className="lg:pl-60">
        <Header />

        <main className="relative pt-16 bg-surface min-h-screen pb-24">
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full space-y-8">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-surface-container">
              <div>
                <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">
                  <span>Help Center</span>
                  <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                  <span className="text-primary font-bold">Customer Support & Knowledge</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                  Help & Support
                </h1>
                <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
                  Have questions, found an issue, or need roadmap guidance? We are here to help you stay on track.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-xs font-semibold text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  Support Online
                </span>
              </div>
            </div>

            {/* Support Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Direct Support Email */}
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-[#E5E4DC] shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[22px]">mail</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface">Direct Email Support</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Get in touch directly with our support team for any queries or custom requirements.
                  </p>
                  <p className="text-xs font-mono font-bold text-primary break-all pt-1">
                    {supportEmail}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex-1 h-9 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                    <span>{copied ? 'Copied!' : 'Copy Email'}</span>
                  </button>
                  <a
                    href={`mailto:${supportEmail}?subject=Taskit%20Support%20Inquiry`}
                    className="flex-1 h-9 px-3 rounded-lg bg-primary-container hover:bg-primary text-xs font-semibold text-on-primary flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Email Us</span>
                  </a>
                </div>
              </div>

              {/* Card 2: Rapid Response SLA */}
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-[#E5E4DC] shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[22px]">schedule</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface">Turnaround Time</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    We review all support tickets with priority. Standard resolution time is under 24 hours on business days.
                  </p>
                  <div className="flex items-center gap-1.5 pt-1 text-xs text-primary font-semibold">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Indian Standard Time (IST) active support</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-surface-container-low text-[11px] text-on-surface-variant">
                  Mon – Sat: 9:00 AM – 9:00 PM IST
                </div>
              </div>

              {/* Card 3: System Status */}
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-[#E5E4DC] shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[22px]">dns</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface">System Reliability</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Database, AI roadmap synthesis, and workspace synchronization services are running normally.
                  </p>
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant">Workspace Database</span>
                      <span className="text-primary font-bold">Operational</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant">Planning Engine</span>
                      <span className="text-primary font-bold">Operational</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span>100% Core Services Operational</span>
                </div>
              </div>
            </div>

            {/* Contact Inquiry Composer */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 border border-[#E5E4DC] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div>
                  <h2 className="text-base font-bold text-on-surface">Submit a Support Ticket or Feedback</h2>
                  <p className="text-xs text-on-surface-variant">
                    Send your inquiry directly to our support inbox ({supportEmail}).
                  </p>
                </div>
              </div>

              {submitted ? (
                <div className="p-6 rounded-xl bg-primary-fixed/40 border border-primary/20 text-center space-y-3 animate-fadeIn">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[24px]">mark_email_read</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface">Inquiry Prepared</h3>
                  <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                    Your inquiry has been formulated. If your mail client did not open automatically, please send your email directly to{' '}
                    <strong className="text-primary">{supportEmail}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setInquirySubject('');
                      setInquiryMessage('');
                    }}
                    className="h-9 px-4 rounded-lg bg-primary-container text-on-primary text-xs font-semibold cursor-pointer"
                  >
                    Submit Another Query
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitInquiry} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-on-surface">Inquiry Category</label>
                      <select
                        value={inquiryCategory}
                        onChange={(e) => setInquiryCategory(e.target.value)}
                        className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      >
                        <option>Technical Support</option>
                        <option>Bug Report</option>
                        <option>Roadmap & Feature Request</option>
                        <option>Account & Workspace Security</option>
                        <option>General Feedback</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-on-surface">Subject</label>
                      <input
                        type="text"
                        value={inquirySubject}
                        onChange={(e) => setInquirySubject(e.target.value)}
                        placeholder="Brief summary of the issue or question"
                        className="h-10 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-on-surface">Details / Message</label>
                    <textarea
                      rows={4}
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder="Please describe what you are experiencing or what you need assistance with..."
                      required
                      className="p-3 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      Inquiries handled securely by support team
                    </span>
                    <button
                      type="submit"
                      className="h-9 px-6 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>Send to Support</span>
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Frequently Asked Questions */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 border border-[#E5E4DC] shadow-xs space-y-4">
              <div className="pb-2 border-b border-surface-container">
                <h2 className="text-base font-bold text-on-surface">Frequently Asked Questions</h2>
                <p className="text-xs text-on-surface-variant">
                  Quick answers to common questions about using Taskit.
                </p>
              </div>

              <div className="space-y-2">
                {faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="border border-surface-container rounded-xl overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between bg-surface-container-low/40 hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-on-surface">{faq.q}</span>
                      <span className="material-symbols-outlined text-[18px] text-outline transition-transform duration-200">
                        {activeFaq === idx ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    {activeFaq === idx && (
                      <div className="p-4 pt-2 text-xs text-on-surface-variant leading-relaxed bg-surface-container-lowest border-t border-surface-container/60">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
