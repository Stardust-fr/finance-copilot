import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-6 text-white">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Finance <span className="text-emerald-400">Copilot</span>
        </h1>
        <p className="mb-8 text-xl text-slate-300">
          AI-powered personal finance management. Import your transactions, get intelligent
          categorization, track budgets, and chat with your financial data.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="rounded-lg bg-emerald-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-600 px-8 py-3 font-semibold text-slate-300 transition-colors hover:border-slate-400 hover:text-white"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
