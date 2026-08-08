import type { StaffMember } from '@/types/qc.types';

/**
 * Demo roster used when personnel storage is empty.
 *
 * These are fictional people standing in for a ZCMC virology bench so the
 * roster, the Performed By picker and the profile pages have something to show
 * before a real roster is entered. Adding anyone through the UI means storage
 * is no longer empty, so this never reappears or competes with real records.
 *
 * IDs are fixed rather than generated: a stable id keeps run attribution
 * pointing at the same person if the seed is ever re-applied to a fresh
 * browser, and makes these records easy to spot when clearing demo data.
 */
/**
 * Bump whenever SEED_STAFF changes.
 *
 * A stored roster stamped with an older version has its seeded records
 * replaced on the next read, which is what lets a change here reach a browser
 * that already seeded. Edits made to a seeded person through the UI are lost
 * when this changes; people *added* through the UI are not.
 */
export const STAFF_SEED_VERSION = 'zcmc-demo-roster-photos-v1';

/** Seeded ids share this prefix, which is how a refresh spares user-added records. */
export const SEED_STAFF_ID_PREFIX = 'seed-staff-';

export const SEED_STAFF: StaffMember[] = [
  {
    id: 'seed-staff-bautista',
    staffId: 'MT-0118',
    displayName: 'Maria Elena Bautista',
    initials: 'MB',
    role: 'supervisor',
    contactNumber: '+63 917 812 4470',
    email: 'me.bautista@zcmc.doh.gov.ph',
    photoUrl: '/staff/maria_bautista.jpg',
    shift: 'morning',
    dutyDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    isActive: true,
    notes: 'Section head, serology. Countersigns rejected runs.',
    createdAt: '2024-02-05T08:00:00.000Z',
    updatedAt: null,
  },
  {
    id: 'seed-staff-andrada',
    staffId: 'MT-0142',
    displayName: 'Joel Andrada',
    initials: 'JA',
    role: 'analyst',
    contactNumber: '+63 918 335 6021',
    email: 'j.andrada@zcmc.doh.gov.ph',
    photoUrl: '/staff/Joel_andrada.jpg',
    shift: 'morning',
    dutyDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    isActive: true,
    notes: null,
    createdAt: '2024-03-18T08:00:00.000Z',
    updatedAt: null,
  },
  {
    id: 'seed-staff-delfin',
    staffId: 'MT-0157',
    displayName: 'Rosario Delfin',
    initials: 'RD',
    role: 'analyst',
    contactNumber: '+63 916 204 8813',
    email: 'r.delfin@zcmc.doh.gov.ph',
    photoUrl: '/staff/Rosario_delfin.jpg',
    shift: 'mid',
    dutyDays: ['tue', 'wed', 'thu', 'fri', 'sat'],
    isActive: true,
    notes: 'Measles and rubella plates.',
    createdAt: '2024-06-24T08:00:00.000Z',
    updatedAt: null,
  },
  {
    id: 'seed-staff-mabalot',
    staffId: 'MT-0163',
    displayName: 'Kristine Mabalot',
    initials: 'KM',
    role: 'analyst',
    contactNumber: '+63 995 471 2298',
    email: 'k.mabalot@zcmc.doh.gov.ph',
    // Percent-encoded: this file is the only one with a space in its name.
    photoUrl: '/staff/Kristine%20Mabalot.jpg',
    shift: 'night',
    dutyDays: ['wed', 'thu', 'fri', 'sat'],
    isActive: true,
    notes: null,
    createdAt: '2024-09-02T08:00:00.000Z',
    updatedAt: null,
  },
  {
    id: 'seed-staff-lacsamana',
    staffId: 'MT-0171',
    displayName: 'Ferdinand Lacsamana',
    initials: 'FL',
    role: 'analyst',
    contactNumber: '+63 927 660 1745',
    email: 'f.lacsamana@zcmc.doh.gov.ph',
    photoUrl: '/staff/Ferdinand_lacsamana.jpg',
    shift: 'rotating',
    dutyDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    isActive: true,
    notes: 'Relief analyst, covers all three controls.',
    createdAt: '2025-01-13T08:00:00.000Z',
    updatedAt: null,
  },
  {
    id: 'seed-staff-sarmiento',
    staffId: 'MT-0184',
    displayName: 'Alvin Sarmiento',
    initials: 'AS',
    role: 'analyst',
    contactNumber: '+63 939 118 5062',
    email: 'a.sarmiento@zcmc.doh.gov.ph',
    photoUrl: '/staff/Alvin_sarmiento.jpg',
    shift: 'mid',
    dutyDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    isActive: true,
    notes: null,
    createdAt: '2025-04-07T08:00:00.000Z',
    updatedAt: null,
  },
  {
    id: 'seed-staff-villanueva',
    staffId: 'ADM-0043',
    displayName: 'Grace Villanueva',
    initials: 'GV',
    role: 'admin',
    contactNumber: '+63 917 559 3384',
    email: 'g.villanueva@zcmc.doh.gov.ph',
    photoUrl: '/staff/Grace_villanueva.jpg',
    shift: 'morning',
    dutyDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    isActive: true,
    notes: 'Records custodian. Handles report releasing.',
    createdAt: '2024-01-22T08:00:00.000Z',
    updatedAt: null,
  },
  {
    id: 'seed-staff-cabrera',
    staffId: 'MT-0126',
    displayName: 'Noel Cabrera',
    initials: 'NC',
    role: 'analyst',
    contactNumber: '+63 906 742 9015',
    email: 'n.cabrera@zcmc.doh.gov.ph',
    photoUrl: '/staff/Noel_cabrera.jpg',
    shift: 'night',
    dutyDays: ['mon', 'tue', 'wed'],
    // Deliberately inactive: exercises the "kept but off the picker" path.
    isActive: false,
    notes: 'Transferred to Chemistry, June 2026.',
    createdAt: '2024-02-05T08:00:00.000Z',
    updatedAt: '2026-06-15T08:00:00.000Z',
  },
];

const SEED_STAFF_BY_ID = new Map(SEED_STAFF.map((member) => [member.id, member]));

/**
 * Attribution rotation for seeded QC runs.
 *
 * Repeats are deliberate — they weight the bench so the roster reads like a
 * real one instead of a perfect round robin. Grace Villanueva is absent
 * because a records custodian releases reports rather than running plates.
 * Noel Cabrera appears despite being inactive: every seeded run falls in March
 * 2026, before his June transfer, which is what gives the roster a person
 * whose history outlives their membership.
 */
const BENCH_ROTATION: string[] = [
  'seed-staff-andrada',
  'seed-staff-delfin',
  'seed-staff-mabalot',
  'seed-staff-andrada',
  'seed-staff-lacsamana',
  'seed-staff-sarmiento',
  'seed-staff-delfin',
  'seed-staff-cabrera',
  'seed-staff-lacsamana',
  'seed-staff-bautista',
  'seed-staff-sarmiento',
  'seed-staff-mabalot',
];

/**
 * Stable string hash, used only to give each control stream a different
 * starting point in the rotation. Without it every stream's first run lands on
 * the same person.
 */
function hashStreamKey(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

/**
 * Picks who recorded a seeded run. Deterministic in (streamKey, runIndex), so
 * re-seeding the same dataset always reproduces the same attribution rather
 * than reshuffling the roster's run counts on every load.
 */
export function pickSeedPerformer(
  streamKey: string,
  runIndex: number,
): { id: string; displayName: string } {
  const rotationIndex = (hashStreamKey(streamKey) + runIndex) % BENCH_ROTATION.length;
  const member = SEED_STAFF_BY_ID.get(BENCH_ROTATION[rotationIndex]);

  if (member === undefined) {
    throw new Error(`BENCH_ROTATION references "${BENCH_ROTATION[rotationIndex]}", which is not in SEED_STAFF.`);
  }

  return { id: member.id, displayName: member.displayName };
}
