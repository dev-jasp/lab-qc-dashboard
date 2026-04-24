import { Button } from '@/components/ui/button';

export default function GoogleLoginButton({ onClick, isLoading }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={isLoading}>
      {isLoading ? 'Signing in...' : 'Continue with Google'}
    </Button>
  );
}
