import { ArrowRightIcon } from "@phosphor-icons/react";
import { motion, type Variants } from "framer-motion";
import { Link } from "react-router-dom";

import { diseaseCardBackgrounds } from "@/constants/landing-images";
import { DISEASE_DEFINITIONS } from "@/constants/monitor-config";

const diseaseCardDescriptions: Record<
  (typeof DISEASE_DEFINITIONS)[number]["slug"],
  string
> = {
  measles:
    "Measles is a highly contagious respiratory virus that causes high fever, cough, runny nose, red watery eyes, and a characteristic red blotchy rash.",
  rubella:
    "Rubella, also known as German measles, is a contagious viral illness that typically causes a mild maculopapular rash starting on the face, along with low-grade fever and swollen lymph nodes.",
  rotavirus:
    "Rotavirus is a common virus that causes severe watery diarrhea, vomiting, fever, and stomach pain, primarily in infants and young children.",
  "japanese-encephalitis":
    "Japanese encephalitis is a mosquito-borne viral infection that occurs mainly in rural parts of Asia and the western Pacific and in rare cases causes inflammation of the brain with severe neurologic complications.",
  dengue:
    "Dengue is a mosquito-borne viral disease caused by any of four related dengue viruses and can range from high fever and severe pain to severe dengue with bleeding, shock, organ failure, and death.",
};

const diseaseBackgroundStyles: Partial<
  Record<
    (typeof DISEASE_DEFINITIONS)[number]["slug"],
    {
      position: string;
      opacity: number;
      scale?: number;
    }
  >
> = {
  measles: {
    position: "88% 34%",
    opacity: 1,
    scale: 1.08,
  },
  rubella: {
    position: "76% 42%",
    opacity: 1,
    scale: 1.07,
  },
  rotavirus: {
    position: "72% 50%",
    opacity: 1,
    scale: 1.09,
  },
  "japanese-encephalitis": {
    position: "78% 50%",
    opacity: 1,
    scale: 1.08,
  },
  dengue: {
    position: "76% 48%",
    opacity: 1,
    scale: 1.08,
  },
};

const institutionalLogos = [
  {
    src: "/images/vpdrl-logo.png",
    alt: "VPDRL logo",
    imageClassName: "scale-110",
  },
  {
    src: "/images/zcmc-patho-logo.jpg",
    alt: "ZCMC Pathology logo",
    imageClassName: "",
  },
  {
    src: "/images/doh-logo.png",
    alt: "Department of Health logo",
    imageClassName: "",
  },
];

const motionEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const headerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const textRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      ease: motionEase,
    },
  },
};

const logoGroupVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.06,
    },
  },
};

const logoRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 6,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: motionEase,
    },
  },
};

const cardGridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.16,
      staggerChildren: 0.07,
    },
  },
};

const cardRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.985,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.34,
      ease: motionEase,
    },
  },
};

export function DiseaseSelector() {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      style={{ backgroundColor: "#FFFFFF" }}
      className="rounded-[36px] p-6 md:p-8 lg:p-9"
    >
      <motion.div className="mb-10" variants={headerVariants}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <motion.p
              variants={textRevealVariants}
              className="mb-4 text-xs font-bold uppercase tracking-[0.35em]"
              style={{ color: "#0000FF" }}
            >
              Real-Time Quality Control
            </motion.p>
            <div className="overflow-hidden pb-1">
              <motion.h1
                variants={textRevealVariants}
                className="max-w-4xl text-4xl font-extrabold leading-[0.98] text-[#111827] sm:text-5xl lg:max-w-[820px] lg:text-[44px] xl:max-w-[980px] xl:text-[52px]"
              >
                Vaccine Preventable Disease Referral Laboratory
              </motion.h1>
            </div>
          </div>

          <motion.div
            variants={textRevealVariants}
            className="hidden shrink-0 lg:block"
          >
            <motion.div
              aria-label="Institutional logos"
              className="flex items-center justify-center gap-4 xl:gap-5"
              variants={logoGroupVariants}
            >
              {institutionalLogos.map((logo) => (
                <motion.div
                  key={logo.src}
                  variants={logoRevealVariants}
                  className="flex h-20 w-20 items-center justify-center rounded-full border border-[#e5e7eb] bg-white p-2 shadow-[0_8px_18px_rgba(15,23,42,0.06)] xl:h-24 xl:w-24"
                >
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    className={`h-full w-full object-contain ${logo.imageClassName}`}
                    loading="eager"
                    decoding="async"
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-6 md:grid-cols-2"
        variants={cardGridVariants}
      >
        {DISEASE_DEFINITIONS.map((disease) => {
          const backgroundImage = diseaseCardBackgrounds[disease.slug];
          const backgroundStyle = diseaseBackgroundStyles[disease.slug];
          const cardSpanClass =
            disease.slug === "dengue" ? "md:col-span-2" : "";

          return (
            <motion.div
              key={disease.slug}
              variants={cardRevealVariants}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.99 }}
              style={{ borderColor: "#F3F3F3", backgroundColor: "#FAFAFA" }}
              className={`group relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-shadow duration-300 hover:z-10 hover:shadow-xl ${cardSpanClass}`}
            >
              {backgroundImage && (
                <img
                  alt=""
                  aria-hidden="true"
                  src={backgroundImage}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover opacity-[var(--card-image-opacity)] will-change-transform"
                  style={{
                    objectPosition: backgroundStyle?.position ?? "center",
                    transform: `translateZ(0) scale(${backgroundStyle?.scale ?? 1.04})`,
                    backfaceVisibility: "hidden",
                    ["--card-image-opacity" as string]: String(
                      backgroundStyle?.opacity ?? 1,
                    ),
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-white/26 via-white/8 to-transparent transition-all duration-300 group-hover:from-white/12 group-hover:via-white/4 group-hover:to-transparent" />
              <div
                className="absolute inset-0 transition-all duration-300 group-hover:opacity-70"
                style={{
                  background:
                    "radial-gradient(circle at center, transparent 34%, rgba(15,23,42,0.12) 100%), linear-gradient(180deg, rgba(15,23,42,0.02) 0%, rgba(15,23,42,0.16) 100%)",
                }}
              />

              <div className="relative z-10 flex min-h-[260px] flex-col">
                <div
                  className={`flex h-full flex-col rounded-2xl border p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-[1px] ${
                    disease.slug === "dengue"
                      ? "max-w-[78%] md:max-w-[42%]"
                      : disease.featured
                        ? "max-w-[78%] md:max-w-[62%]"
                        : "max-w-[86%] md:max-w-[80%]"
                  }`}
                  style={{
                    backgroundColor: "rgba(244, 247, 252, 0.88)",
                    borderColor: "rgba(255, 255, 255, 0.68)",
                  }}
                >
                  <div className="mb-5">
                    <h2
                      className="mt-2 text-2xl font-bold leading-tight"
                      style={{ color: "#1E293B" }}
                    >
                      {disease.name}
                    </h2>
                  </div>

                  <div>
                    <p
                      className="max-w-xl text-sm leading-6"
                      style={{ color: "#526377" }}
                    >
                      {diseaseCardDescriptions[disease.slug]}
                    </p>
                  </div>
                </div>

                <Link
                  to={`/monitor/${disease.slug}`}
                  className="group/cta mt-4 inline-flex w-fit items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition-all duration-300 hover:translate-x-1 hover:border-[#C7D2FE] hover:bg-[#EEF2FF]"
                  style={{
                    color: "#1730D1",
                    backgroundColor: "rgba(255, 255, 255, 0.82)",
                    borderColor: "rgba(191, 219, 254, 0.9)",
                  }}
                >
                  <span>View charts</span>
                  <ArrowRightIcon
                    size={18}
                    className="transition-transform duration-300 group-hover/cta:translate-x-1"
                    style={{ color: "#1730D1" }}
                  />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.section>
  );
}
