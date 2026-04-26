import {
  BellIcon,
  CaretDownIcon,
  ChartBarIcon,
  ChartLineUpIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
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

const LOGIN_FEATURES = [
  { label: "Real-time QC Monitoring", Icon: ChartLineUpIcon },
  { label: "Data Integrity & Compliance", Icon: ShieldCheckIcon },
  { label: "Alerts & Violations", Icon: BellIcon },
  { label: "Actionable Insights", Icon: ChartBarIcon },
];

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

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      role="img"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
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

  const handleGoogleLogin = () => {
    setFeedback({
      tone: "info",
      message:
        "Google login is visual only for now. Please use email sign-in while setup is pending.",
    });
  };

  return (
    <div className="h-svh overflow-hidden bg-[#eef2f6] text-[#0f172a]">
      <div className="grid h-svh lg:grid-cols-[minmax(420px,0.78fr)_minmax(0,1.22fr)]">
        <section className="flex h-svh items-center bg-white px-5 py-4 sm:px-8 lg:px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: MOTION_EASE }}
            className="mx-auto w-full max-w-[500px] rounded-2xl border border-sky-200/80 bg-white px-6 py-7 shadow-[0_24px_70px_rgba(14,165,233,0.11)] sm:px-7 lg:px-8"
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

              <div className="flex items-center gap-3 text-[12px] font-semibold text-[#94a3b8]">
                <span className="h-px flex-1 bg-[#e2e8f0]" />
                <span>or</span>
                <span className="h-px flex-1 bg-[#e2e8f0]" />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="h-11 w-full gap-3 rounded-md border-[#cbd5e1] bg-white text-[15px] font-semibold text-[#334155] shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:border-[#94a3b8] hover:bg-[#f8fafc]"
              >
                <GoogleIcon />
                Continue with Google
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

        <section className="relative hidden h-svh overflow-hidden bg-[#eef4ff] lg:block">
          <img
            src="/images/qc-lab-background-source.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover saturate-[1.08] contrast-[1.03]"
            loading="eager"
            decoding="async"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,251,255,0.18)_0%,rgba(248,251,255,0.08)_34%,rgba(8,24,53,0.04)_100%)]"
          />

          <motion.div
            initial={{ opacity: 0, x: 28, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.65, ease: MOTION_EASE }}
            className="relative h-full w-full overflow-hidden"
          >
            <div className="absolute left-1/2 top-1/2 z-20 w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2 px-8 text-center xl:max-w-[580px]">
              <p className="text-[2.15rem] leading-[1.08] font-extrabold text-[#081835] xl:text-[2.45rem] 2xl:text-[2.75rem]">
                Monitor your samples.
                <span className="mt-1 block text-[#1a1aff]">
                  Ensure every result is reliable.
                </span>
              </p>
              <div className="mx-auto mt-8 flex w-fit flex-col gap-4 text-left">
                {LOGIN_FEATURES.map(({ label, Icon }) => (
                  <div key={label} className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#c7d2fe] bg-white/72 text-[#1a1aff] shadow-[0_10px_28px_rgba(26,26,255,0.12)] backdrop-blur-sm">
                      <Icon size={28} weight="regular" aria-hidden="true" />
                    </span>
                    <span className="text-[1.08rem] leading-6 font-medium text-[#081835] xl:text-[1.16rem]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
