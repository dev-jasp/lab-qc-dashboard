import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-6">
      <div className="w-full max-w-md rounded-[20px] border border-[#f0f0f0] bg-white p-8 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1a1aff] text-white">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-lg font-bold text-[#1a1aff]">QC PULSE</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9ca3af]">Laboratory System</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#111827]">Session cleared</h1>
        <p className="mt-3 text-sm leading-6 text-[#6b7280]">
          This route is ready for the future PIN-based login flow. For now, you can return to the monitor workspace from here.
        </p>

        <Link
          to="/monitor"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#1a1aff] text-sm font-semibold text-white transition hover:bg-[#1515cc]"
        >
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
