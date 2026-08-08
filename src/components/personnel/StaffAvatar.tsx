import { useEffect, useState } from 'react';

import { cn } from '@/utils/cn';

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-9 w-9 text-[12px]',
} as const;

interface StaffAvatarProps {
  initials: string;
  isActive: boolean;
  /** Portrait to show instead of the initials. Falls back if it fails to load. */
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
}

/**
 * Portrait for a staff member, degrading to their initials.
 *
 * The image is marked decorative: every caller renders the person's name
 * beside it, so announcing it again would just double up for screen readers.
 */
export function StaffAvatar({
  initials,
  isActive,
  photoUrl = null,
  size = 'md',
}: StaffAvatarProps) {
  const [hasImageFailed, setHasImageFailed] = useState(false);

  // A record can be edited to point at a different photo; retry that one
  // rather than staying stuck on the previous failure.
  useEffect(() => {
    setHasImageFailed(false);
  }, [photoUrl]);

  const dimensions = SIZES[size];

  if (photoUrl !== null && photoUrl !== '' && !hasImageFailed) {
    return (
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setHasImageFailed(true)}
        className={cn(
          'shrink-0 rounded-full object-cover',
          dimensions,
          !isActive && 'opacity-60 grayscale',
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        dimensions,
        isActive ? 'bg-[#eef2ff] text-[#1a1aff]' : 'bg-[#f3f4f6] text-[#9ca3af]',
      )}
    >
      {initials}
    </span>
  );
}
