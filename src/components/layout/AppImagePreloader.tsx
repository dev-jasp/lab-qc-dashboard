import { landingImageSources } from '@/constants/landing-images';

export function AppImagePreloader() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden opacity-0"
    >
      {landingImageSources.map((src) => (
        <img
          key={src}
          alt=""
          src={src}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          width={1}
          height={1}
        />
      ))}
    </div>
  );
}
