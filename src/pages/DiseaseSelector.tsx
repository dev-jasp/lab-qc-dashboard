import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { diseaseCardBackgrounds } from '@/constants/landing-images';
import { DISEASE_DEFINITIONS } from '@/constants/monitor-config';

const diseaseCardDescriptions: Record<(typeof DISEASE_DEFINITIONS)[number]['slug'], string> = {
  measles:
    'Measles is a highly contagious respiratory virus that causes high fever, cough, runny nose, red watery eyes, and a characteristic red blotchy rash.',
  rubella:
    'Rubella, also known as German measles, is a contagious viral illness that typically causes a mild maculopapular rash starting on the face, along with low-grade fever and swollen lymph nodes.',
  rotavirus:
    'Rotavirus is a common virus that causes severe watery diarrhea, vomiting, fever, and stomach pain, primarily in infants and young children.',
  'japanese-encephalitis':
    'Japanese encephalitis is a mosquito-borne viral infection that occurs mainly in rural parts of Asia and the western Pacific and in rare cases causes inflammation of the brain with severe neurologic complications.',
  dengue:
    'Dengue is a mosquito-borne viral disease caused by any of four related dengue viruses and can range from high fever and severe pain to severe dengue with bleeding, shock, organ failure, and death.',
};

const diseaseBackgroundStyles: Partial<
  Record<
    (typeof DISEASE_DEFINITIONS)[number]['slug'],
    {
      position: string;
      opacity: number;
      filter?: string;
      scale?: number;
    }
  >
> = {
  measles: {
    position: '88% 34%',
    opacity: 1,
    filter: 'contrast(1.22) saturate(1.2) brightness(0.99)',
    scale: 1.08,
  },
  rubella: {
    position: '76% 42%',
    opacity: 1,
    filter: 'contrast(1.22) saturate(1.2) brightness(0.99)',
    scale: 1.07,
  },
  rotavirus: {
    position: '72% 50%',
    opacity: 1,
    filter: 'contrast(1.24) saturate(1.22) brightness(0.98)',
    scale: 1.09,
  },
  'japanese-encephalitis': {
    position: '78% 50%',
    opacity: 1,
    filter: 'contrast(1.24) saturate(1.22) brightness(0.97)',
    scale: 1.08,
  },
  dengue: {
    position: '76% 48%',
    opacity: 1,
    filter: 'contrast(1.24) saturate(1.22) brightness(0.98)',
    scale: 1.08,
  },
};

export function DiseaseSelector() {
  return (
    <div className="min-h-screen bg-white">
      <DashboardHeader activeTab="monitor" />

      <main className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <section
            style={{ backgroundColor: '#FFFFFF' }}
            className="rounded-[36px] p-6 md:p-8 lg:p-9"
          >
            <div className="mb-10">
              <p
                className="text-xs font-bold uppercase tracking-[0.35em] mb-4"
                style={{ color: '#0000FF' }}
              >
                Real-Time Quality Control
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold max-w-4xl leading-[0.95]"
                style={{ color: '#111827' }}
              >
                Vaccine Preventable Disease Referral Laboratory
              </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {DISEASE_DEFINITIONS.map((disease) => {
                const backgroundImage = diseaseCardBackgrounds[disease.slug];
                const backgroundStyle = diseaseBackgroundStyles[disease.slug];
                const cardSpanClass = disease.slug === 'dengue' ? 'md:col-span-2' : '';

                return (
                  <Link
                    key={disease.slug}
                    to={`/monitor/${disease.slug}`}
                    style={{ borderColor: '#F3F3F3', backgroundColor: '#FAFAFA' }}
                    className={`group relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cardSpanClass}`}
                  >
                    {backgroundImage && (
                      <img
                        alt=""
                        aria-hidden="true"
                        src={backgroundImage}
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover will-change-transform"
                        style={{
                          objectPosition: backgroundStyle?.position ?? 'center',
                          opacity: backgroundStyle?.opacity ?? 0.45,
                          filter: backgroundStyle?.filter,
                          transform: `translateZ(0) scale(${backgroundStyle?.scale ?? 1.04})`,
                          backfaceVisibility: 'hidden',
                        }}
                      />
                    )}
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-white/32 via-white/12 to-white/0"
                    />
                    <div
                      className="absolute inset-0 bg-black/5"
                      style={{
                        background:
                          'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.08) 100%), rgba(0,0,0,0.10)',
                      }}
                    />

                    <div className="relative z-10 min-h-[260px] flex flex-col">
                      <div
                        className={`flex h-full flex-col rounded-2xl border p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-[1px] ${
                          disease.slug === 'dengue'
                            ? 'max-w-[48%] md:max-w-[42%]'
                            : disease.featured
                              ? 'max-w-[62%]'
                              : 'max-w-[80%]'
                        }`}
                        style={{
                          backgroundColor: 'rgba(248, 250, 255, 0.80)',
                          borderColor: 'rgba(255, 255, 255, 0.62)',
                        }}
                      >
                        <div className="mb-6">
                          <h2 className="text-2xl font-bold" style={{ color: '#0F1D33' }}>
                            {disease.name}
                          </h2>
                          <p className="text-sm mt-2 max-w-xl leading-6" style={{ color: '#42546A' }}>
                            {diseaseCardDescriptions[disease.slug]}
                          </p>
                        </div>

                        <div className="mt-auto flex items-center justify-between">
                          <span className="text-sm font-bold" style={{ color: '#1730D1' }}>
                            View charts
                          </span>
                          <ArrowRight size={18} style={{ color: '#1730D1' }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
