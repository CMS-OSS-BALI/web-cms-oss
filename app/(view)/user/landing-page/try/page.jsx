"use client";

import Link from "next/link";

export default function TryPage() {
  return (
    <main className="min-h-[70vh] p-6 flex flex-col gap-4">
      <div className="card-dark card-hover text-slate-100">
        <h1 className="text-2xl font-extrabold mb-1">Try Page</h1>
        <p className="opacity-80">
          You are on a different route. This should produce another pageview
          event.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/user/landing-page"
            className="px-4 py-2 rounded-lg border border-slate-600/50 text-slate-100 hover:border-slate-400/70"
          >
            Back to Landing
          </Link>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:brightness-110"
          >
            Open Admin Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
