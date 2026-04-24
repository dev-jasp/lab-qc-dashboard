import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import GoogleLoginButton from '@/components/GoogleLoginButton.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useAuth from '@/hooks/useAuth.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleEmailLogin = async ({ email, password }) => {
    setGeneralError('');
    setIsSubmitting(true);

    try {
      await loginWithEmail(email, password);
      navigate('/dashboard');
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGeneralError('');
    setIsSubmitting(true);

    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit(handleEmailLogin)}>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            aria-invalid={Boolean(errors.email)}
            {...register('email', {
              required: 'Email is required.',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Enter a valid email address.',
              },
            })}
          />
          {errors.email ? <p className="text-destructive">{errors.email.message}</p> : null}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            aria-invalid={Boolean(errors.password)}
            {...register('password', {
              required: 'Password is required.',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters.',
              },
            })}
          />
          {errors.password ? (
            <p className="text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Login'}
        </Button>
      </form>
      <div>or</div>
      <GoogleLoginButton onClick={handleGoogleLogin} isLoading={isSubmitting} />
      {generalError ? <div>{generalError}</div> : null}
    </div>
  );
}
