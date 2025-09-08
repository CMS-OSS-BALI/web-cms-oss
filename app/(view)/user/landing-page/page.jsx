"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-[80vh] p-6 flex flex-col gap-6">
      {/* Header mini */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 grid place-items-center rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold">
            OSS
          </div>
          <span className="text-slate-100 font-semibold">OSS CMS</span>
        </div>

        <nav className="flex gap-4 text-sm">
          <Link
            href="/user/landing-page#features"
            className="text-slate-300 hover:text-white"
          >
            Features
          </Link>
          <Link
            href="/user/landing-page#cta"
            className="text-slate-300 hover:text-white"
          >
            Get Started
          </Link>
          <Link
            href="/admin/dashboard"
            className="text-slate-300 hover:text-white"
          >
            Admin
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="card-dark card-hover text-slate-100">
        <h1 className="text-3xl font-extrabold mb-2">Welcome to OSS CMS</h1>
        <p className="opacity-80">
          This is a simple public landing page to test the visitor tracking. Try
          navigating to another page, refreshing, or opening in Incognito to
          generate events.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/user/landing-page/try"
            className="px-4 py-2 rounded-lg border border-slate-600/50 hover:border-slate-400/70 text-slate-100"
          >
            Go to Try Page
          </Link>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:brightness-110"
          >
            Open Admin Dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card-dark card-hover">
          <h3 className="m-0 text-sm font-bold text-slate-100">
            Manage Events
          </h3>
          <p className="m-0 mt-1 text-xs text-slate-400">
            Create, schedule, and publish events with ease.
          </p>
        </div>
        <div className="card-dark card-hover">
          <h3 className="m-0 text-sm font-bold text-slate-100">Programs</h3>
          <p className="m-0 mt-1 text-xs text-slate-400">
            Group events into programs and track progress.
          </p>
        </div>
        <div className="card-dark card-hover">
          <h3 className="m-0 text-sm font-bold text-slate-100">Partners</h3>
          <p className="m-0 mt-1 text-xs text-slate-400">
            Maintain a directory of internal & external partners.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section
        id="cta"
        className="card-dark card-hover flex items-center justify-between flex-wrap gap-3"
      >
        <div>
          <h3 className="m-0 text-sm font-bold text-slate-100">
            Ready to explore?
          </h3>
          <p className="m-0 mt-1 text-xs text-slate-400">
            Navigate to the try page to trigger a new pageview.
          </p>
        </div>
        <Link
          href="/user/landing-page/try"
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:brightness-110"
        >
          Continue
        </Link>
      </section>

      <footer className="text-xs text-slate-400 opacity-80">
        © {new Date().getFullYear()} OSS Bali • Public Landing
      </footer>
    </main>
  );
}
