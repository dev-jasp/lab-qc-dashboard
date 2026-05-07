import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export function Settings() {
  return (
    <div className="rounded-2xl border border-[#F3F3F3] bg-white p-8 shadow">
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h1
            className="mt-2 text-3xl font-extrabold"
            style={{ color: "#111827" }}
          >
            Settings & Lot Management
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-[#F3F3F3] bg-[#FBFBFB] p-6">
          <div
            className="mb-3 flex items-center gap-2"
            style={{ color: "#0000FF" }}
          >
            <SlidersHorizontalIcon size={18} />
            <span className="font-bold">Lab configuration</span>
          </div>
          <p className="text-sm leading-7" style={{ color: "#64748B" }}>
            Active lot management, technician defaults, and disease-specific
            control parameters will live here.
          </p>
        </div>

        <div className="rounded-xl border border-[#F3F3F3] bg-[#FBFBFB] p-6">
          <p className="text-sm leading-7" style={{ color: "#64748B" }}>
            The router is now ready for disease-scoped settings and lot
            configuration once you decide how each disease should persist its
            control definitions.
          </p>
          <Link
            to="/monitor"
            className="mt-5 inline-flex items-center gap-2 font-semibold"
            style={{ color: "#0000FF" }}
          >
            Back to monitor
          </Link>
        </div>
      </div>
    </div>
  );
}
