import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useAuth from '@/hooks/useAuth.js';

const MOTION_EASE = [0.22, 1, 0.36, 1];

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.65Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3c-1.07.72-2.45 1.15-4.05 1.15-3.12 0-5.76-2.1-6.7-4.93H1.3v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.31A7.2 7.2 0 0 1 4.93 12c0-.8.14-1.57.37-2.31V6.6H1.3A12 12 0 0 0 0 12c0 1.94.46 3.78 1.3 5.4l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.33.6 4.57 1.77l3.42-3.42C17.94 1.2 15.24 0 12 0A12 12 0 0 0 1.3 6.6l4 3.09c.94-2.83 3.58-4.92 6.7-4.92Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const handleEmailLogin = async ({ email, password }) => {
    setFeedback(null);
    setIsSubmitting(true);

    try {
      await loginWithEmail(email, password);
      navigate('/monitor');
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to sign in.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setFeedback(null);
    setIsSubmitting(true);

    try {
      await loginWithGoogle();
      navigate('/monitor');
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unable to sign in.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    setFeedback({
      tone: 'info',
      message: 'Password reset is not configured yet. Please contact your QC administrator.',
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8fafc]">
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-[#1a1aff]/10 blur-3xl" />
        <div className="absolute -left-16 bottom-12 h-44 w-44 rounded-full bg-[#dbeafe] blur-3xl" />
        <div className="absolute -right-12 top-20 h-40 w-40 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-5 py-5 sm:px-6 sm:py-6">
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: MOTION_EASE }}
          className="w-full max-w-lg rounded-[1.75rem] border border-white/70 bg-white/88 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.45, ease: MOTION_EASE }}
            className="mb-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-white shadow-[0_12px_32px_rgba(26,26,255,0.14)] ring-1 ring-[#dbe3ff]">
                <img
                  src="/images/brand-logo.png"
                  alt="QC Pulse logo"
                  className="h-10 w-10 rounded-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <div>
                <p className="text-[1.95rem] font-extrabold tracking-[-0.03em] text-[#0f172a]">QC Pulse</p>
                <p className="text-[13px] font-medium text-[#64748b]">Laboratory quality control dashboard</p>
              </div>
            </div>

            <h1 className="max-w-md text-3xl leading-tight font-extrabold tracking-[-0.04em] text-[#0f172a] sm:text-[2.35rem]">
              Login to your account
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-6 text-[#64748b] sm:text-base">
              Review control runs, monitor OD trends, and keep your VPDRL workflow moving from one secure workspace.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.48, ease: MOTION_EASE }}
            onSubmit={handleSubmit(handleEmailLogin)}
            noValidate
            className="space-y-4.5"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-[#334155]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                spellCheck={false}
                placeholder="demo@gmail.com"
                className="h-12 rounded-2xl border-[#dbe2ea] bg-white px-4 text-[15px] text-[#0f172a] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition focus-visible:border-[#1a1aff] focus-visible:ring-[#1a1aff]/15"
                {...register('email', {
                  required: 'Email is required.',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address.',
                  },
                })}
              />
              {errors.email ? <p className="text-sm font-medium text-[#dc2626]">{errors.email.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-[#334155]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  placeholder="Enter your password"
                  className="h-12 rounded-2xl border-[#dbe2ea] bg-white px-4 pr-12 text-[15px] text-[#0f172a] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition focus-visible:border-[#1a1aff] focus-visible:ring-[#1a1aff]/15"
                  {...register('password', {
                    required: 'Password is required.',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters.',
                    },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-2xl text-[#94a3b8] transition hover:text-[#475569]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
              {errors.password ? (
                <p className="text-sm font-medium text-[#dc2626]">{errors.password.message}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-2xl bg-[#1a1aff] text-[15px] font-semibold text-white shadow-[0_18px_45px_rgba(26,26,255,0.22)] transition hover:bg-[#1515e0]"
            >
              {isSubmitting ? 'Signing in...' : 'Login'}
            </Button>

            <div className="flex flex-col gap-2.5 text-sm text-[#334155] sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2.5">
                <input
                  type="checkbox"
                  className="h-4.5 w-4.5 rounded-[0.35rem] border border-[#cbd5e1] text-[#1a1aff] focus:ring-2 focus:ring-[#1a1aff]/25"
                  {...register('rememberMe')}
                />
                <span className="font-medium text-[#334155]">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-left text-[13px] font-medium text-[#0f172a] underline decoration-[#cbd5e1] underline-offset-4 transition hover:text-[#1a1aff] sm:text-right"
              >
                Forgot your password?
              </button>
            </div>

            <div className="flex items-center gap-4 pt-0.5 text-xs text-[#94a3b8]">
              <div className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="font-medium uppercase tracking-[0.24em]">or</span>
              <div className="h-px flex-1 bg-[#e2e8f0]" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="h-12 w-full rounded-2xl border-[#dbe2ea] bg-white text-[15px] font-semibold text-[#0f172a] transition hover:border-[#c7d2fe] hover:bg-[#f8faff]"
            >
              <GoogleMark />
              {isSubmitting ? 'Signing in...' : 'Sign in with Google'}
            </Button>

            {feedback ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  feedback.tone === 'error'
                    ? 'border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]'
                    : 'border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]'
                }`}
              >
                {feedback.message}
              </div>
            ) : null}
          </motion.form>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.4, ease: MOTION_EASE }}
            className="mt-5 text-center text-xs leading-5 text-[#64748b]"
          >
            Need access to QC Pulse? <span className="font-semibold text-[#1a1aff]">Contact your administrator.</span>
          </motion.p>
        </motion.section>
      </div>
    </div>
  );
}
