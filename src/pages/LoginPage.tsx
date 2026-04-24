import {
  CaretDownIcon,
  ChartBarIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

const MOTION_EASE = [0.22, 1, 0.36, 1] as const;
const LOGIN_TRANSITION_DELAY_MS = 900;

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type Feedback = {
  tone: "error" | "info";
  message: string;
};

const QUICK_LOGINS = [
  { label: "Admin", email: "admin@vpdrl.com", password: "Admin@2025" },
  {
    label: "Supervisor",
    email: "supervisor@vpdrl.com",
    password: "Super@2025",
  },
  { label: "Analyst", email: "analyst@vpdrl.com", password: "Analyst@2025" },
];

const DEFAULT_DEMO_LOGIN = {
  email: "analyst@vpdrl.com",
  password: "Analyst@2025",
};

const CONTROL_STREAMS = [
  { label: "In-house", value: "0.7812", state: "Stable", color: "#16a34a" },
  { label: "Positive", value: "1.4288", state: "Watch", color: "#d97706" },
  { label: "Negative", value: "0.1186", state: "Clear", color: "#16a34a" },
];

const RECENT_RUNS = ["MEA-IH-024", "RUB-PC-018", "DEN-NC-011"];

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function LoginSpinner() {
  return (
    <span className="relative h-2.5 w-2.5 animate-spin" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <span
          key={index}
          className="absolute left-1/2 top-1/2 h-[3px] w-px origin-[50%_4px] -translate-x-1/2 -translate-y-1 rounded-full bg-white"
          style={{
            opacity: 0.22 + index * 0.07,
            transform: `rotate(${index * 45}deg) translateY(-4px)`,
          }}
        />
      ))}
    </span>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isQuickLoginOpen, setIsQuickLoginOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setFocus,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: DEFAULT_DEMO_LOGIN.email,
      password: DEFAULT_DEMO_LOGIN.password,
      rememberMe: false,
    },
  });

  useEffect(() => {
    setFocus("email");
  }, [setFocus]);

  const clearFeedback = () => {
    if (feedback !== null) {
      setFeedback(null);
    }
  };

  const handleEmailLogin: SubmitHandler<LoginFormValues> = async ({
    email,
    password,
  }) => {
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const result = await signIn(email, password);

      if ("error" in result) {
        setFeedback({
          tone: "error",
          message: result.error,
        });
        return;
      }

      await wait(LOGIN_TRANSITION_DELAY_MS);
      navigate("/monitor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    setFeedback({
      tone: "info",
      message:
        "Password reset is not configured yet. Please contact your QC administrator.",
    });
  };

  const handleQuickLogin = (credentials: (typeof QUICK_LOGINS)[number]) => {
    setValue("email", credentials.email, { shouldValidate: true });
    setValue("password", credentials.password, { shouldValidate: true });
    setFeedback(null);
  };

  return (
    <div className="h-svh overflow-hidden bg-[#eef2f6] text-[#0f172a]">
      <div className="grid h-svh lg:grid-cols-[minmax(420px,0.86fr)_minmax(0,1.14fr)]">
        <section className="flex h-svh items-center bg-white px-5 py-4 sm:px-8 lg:px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: MOTION_EASE }}
            className="mx-auto w-full max-w-[470px]"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.45, ease: MOTION_EASE }}
              className="mb-5"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-white shadow-[0_12px_32px_rgba(26,26,255,0.14)] ring-1 ring-[#dbe3ff]">
                  <img
                    src="/images/brand-logo.png"
                    alt="QC Pulse logo"
                    className="h-9 w-9 rounded-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                </div>
                <div>
                  <p className="text-[1.75rem] font-extrabold text-[#0f172a]">
                    QC Pulse
                  </p>
                </div>
              </div>

              <h1 className="max-w-md text-[1.65rem] leading-tight font-extrabold text-[#0f172a] sm:text-[1.85rem]">
                Login to your account
              </h1>
              <p className="mt-2 max-w-md text-[13px] lg:mb-8 leading-5 text-[#64748b]">
                Review control runs, monitor OD trends, and keep your VPDRL
                workflow moving from one secure workspace.
              </p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.48, ease: MOTION_EASE }}
              onSubmit={handleSubmit(handleEmailLogin)}
              noValidate
              className="space-y-3.5"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-[#334155]"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  spellCheck={false}
                  placeholder="you@vpdrl.com"
                  className="h-12 rounded-md border-[#cbd5e1] bg-white px-4 text-[15px] text-[#0f172a] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition focus-visible:border-[#1a1aff] focus-visible:ring-[#1a1aff]/15"
                  {...register("email", {
                    onChange: clearFeedback,
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address.",
                    },
                  })}
                />
                {errors.email ? (
                  <p className="text-sm font-medium text-[#dc2626]">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-semibold text-[#334155]"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    placeholder="Enter your password"
                    className="h-12 rounded-md border-[#cbd5e1] bg-white px-4 pr-12 text-[15px] text-[#0f172a] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition focus-visible:border-[#1a1aff] focus-visible:ring-[#1a1aff]/15"
                    {...register("password", {
                      onChange: clearFeedback,
                      required: "Password is required",
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-md text-[#94a3b8] transition hover:text-[#475569]"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeSlashIcon size={20} />
                    ) : (
                      <EyeIcon size={20} />
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-sm font-medium text-[#dc2626]">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-md bg-[#1a1aff] text-[15px] font-semibold text-white shadow-[0_18px_45px_rgba(26,26,255,0.22)] transition hover:bg-[#1515e0] disabled:bg-[#94a3ff] disabled:opacity-100"
              >
                {isSubmitting ? (
                  <>
                    <LoginSpinner />
                    Login
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              <div className="flex flex-col gap-2.5 text-[13px] leading-5 text-[#334155] sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded-[0.25rem] border border-[#cbd5e1] text-[#1a1aff] focus:ring-2 focus:ring-[#1a1aff]/25"
                    {...register("rememberMe")}
                  />
                  <span className="font-medium text-[#334155]">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-left text-[13px] leading-5 font-medium text-[#0f172a] underline decoration-[#cbd5e1] underline-offset-4 transition hover:text-[#1a1aff] sm:text-right"
                >
                  Forgot your password?
                </button>
              </div>

              {feedback ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                    feedback.tone === "error"
                      ? "border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]"
                      : "border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]"
                  }`}
                >
                  {feedback.message}
                </div>
              ) : null}
            </motion.form>

            {import.meta.env.DEV ? (
              <div className="mt-4 rounded-md border border-[#dbe2ea] bg-[#f8fafc] p-3">
                <button
                  type="button"
                  onClick={() => setIsQuickLoginOpen((current) => !current)}
                  className="flex w-full items-center justify-between text-left text-xs font-semibold text-[#64748b]"
                  aria-expanded={isQuickLoginOpen}
                >
                  <span>Quick login (dev only)</span>
                  <CaretDownIcon
                    size={14}
                    className={`transition-transform ${isQuickLoginOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isQuickLoginOpen ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {QUICK_LOGINS.map((credentials) => (
                      <Button
                        key={credentials.email}
                        type="button"
                        variant="outline"
                        onClick={() => handleQuickLogin(credentials)}
                        className="h-8 rounded-md border-[#cbd5e1] bg-white px-2 text-xs font-semibold text-[#475569]"
                      >
                        {credentials.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </motion.div>
        </section>

        <section className="relative hidden h-svh overflow-hidden bg-[#dbeafe] px-8 py-6 lg:flex lg:items-center xl:px-14">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(135deg,#1a1aff_0%,#4f7dff_42%,#dbeafe_76%,#f8fbff_100%)]"
          />

          <motion.div
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.65, ease: MOTION_EASE }}
            className="relative mx-auto w-full max-w-[760px]"
          >
            <div className="mb-5 max-w-[590px]">
              <h2 className="max-w-xl text-4xl leading-[1.05] font-extrabold text-white drop-shadow-[0_10px_32px_rgba(15,23,42,0.18)] xl:text-[2.8rem]">
                Monitor OD runs before they become release risks.
              </h2>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white shadow-[0_28px_78px_rgba(29,78,216,0.24)]">
              <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-3.5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#64748b]">
                    Levey-Jennings Monitor
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#111827]">
                    Measles - In-house Control
                  </p>
                </div>
                <div className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#16a34a]">
                  In Control
                </div>
              </div>

              <div className="grid gap-0 xl:grid-cols-[1fr_220px]">
                <div className="border-b border-[#e5e7eb] p-4 xl:border-r xl:border-b-0">
                  <div className="mb-3 grid grid-cols-3 gap-3">
                    {CONTROL_STREAMS.map((stream) => (
                      <div
                        key={stream.label}
                        className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-2.5"
                      >
                        <p className="text-[11px] font-semibold text-[#64748b]">
                          {stream.label}
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#111827]">
                          {stream.value}
                        </p>
                        <p
                          className="mt-1 text-[11px] font-semibold"
                          style={{ color: stream.color }}
                        >
                          {stream.state}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="relative h-[220px] rounded-2xl border border-[#e5e7eb] bg-white p-4">
                    <div className="absolute inset-x-4 top-[48px] border-t border-[#ef4444]" />
                    <div className="absolute inset-x-4 top-[86px] border-t border-dashed border-[#f59e0b]" />
                    <div className="absolute inset-x-4 top-[134px] border-t border-[#94a3b8]" />
                    <div className="absolute inset-x-4 top-[182px] border-t border-dashed border-[#f59e0b]" />
                    <div className="absolute inset-x-4 top-[220px] border-t border-[#ef4444]" />
                    <svg
                      viewBox="0 0 560 230"
                      className="relative z-10 h-full w-full"
                      role="img"
                      aria-label="Mock Levey-Jennings chart with OD points around the mean"
                    >
                      <polyline
                        points="18,145 68,123 118,132 168,111 218,118 268,96 318,108 368,82 418,101 468,76 518,91"
                        fill="none"
                        stroke="#1a1aff"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {[
                        18, 68, 118, 168, 218, 268, 318, 368, 418, 468, 518,
                      ].map((x, index) => {
                        const y = [
                          145, 123, 132, 111, 118, 96, 108, 82, 101, 76, 91,
                        ][index];
                        const isFlagged = index === 7;

                        return (
                          <circle
                            key={`${x}-${y}`}
                            cx={x}
                            cy={y}
                            r={isFlagged ? 8 : 6}
                            fill={isFlagged ? "#ef4444" : "#1a1aff"}
                            stroke="#ffffff"
                            strokeWidth="4"
                          />
                        );
                      })}
                    </svg>
                  </div>
                </div>

                <div className="bg-[#f8fafc] p-4">
                  <div className="mb-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#111827]">
                      <ChartBarIcon size={17} className="text-[#1a1aff]" />
                      Run Statistics
                    </div>
                    <div className="space-y-2.5">
                      {[
                        ["Mean", "0.762"],
                        ["SD", "0.041"],
                        ["CV", "5.38%"],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between"
                        >
                          <span className="text-xs font-semibold text-[#64748b]">
                            {label}
                          </span>
                          <span className="font-bold text-[#111827]">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 rounded-2xl border border-[#dcfce7] bg-[#f0fdf4] p-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#166534]">
                      <CheckCircleIcon size={17} weight="fill" />
                      Rules Passed
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#166534]/80">
                      No rejection rules in the active set.
                    </p>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#111827]">
                      <WarningIcon size={17} className="text-[#d97706]" />
                      Recent Runs
                    </div>
                    <div className="space-y-2">
                      {RECENT_RUNS.map((run, index) => (
                        <div
                          key={run}
                          className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-3 py-2"
                        >
                          <span className="text-xs font-semibold text-[#334155]">
                            {run}
                          </span>
                          <span className="text-[11px] font-bold text-[#94a3b8]">
                            #{index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
