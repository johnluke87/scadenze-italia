const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

export { MONTHS };

export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function todayIso() {
  return toIso(new Date());
}

export function formatDate(iso, { weekday = false } = {}) {
  if (!iso) return '';
  const d = parseDate(iso);
  const s = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return weekday ? `${WEEKDAYS[d.getDay()]} ${s}` : s;
}

export function daysUntil(iso) {
  const a = parseDate(todayIso());
  const b = parseDate(iso);
  return Math.round((b - a) / 86400000);
}

export function relative(iso) {
  const n = daysUntil(iso);
  if (n === 0) return 'oggi';
  if (n === 1) return 'domani';
  if (n === -1) return 'ieri';
  if (n < 0) return `scaduta da ${-n} giorni`;
  if (n < 60) return `tra ${n} giorni`;
  const months = Math.round(n / 30);
  if (n < 730) return `tra ${months} mesi`;
  return `tra ${Math.round(n / 365)} anni`;
}

export const STATE_LABEL = {
  overdue: 'Scaduta',
  week: 'Questa settimana',
  soon: 'In scadenza',
  open: 'Aperta',
  done: 'Fatta',
  archived: 'Archiviata',
};

export function recurLabel(recur) {
  if (!recur || recur === 'none' || recur === 'once') return 'Una volta';
  let m = recur.match(/^years:(\d+)$/);
  if (m) return m[1] === '1' ? 'Ogni anno' : `Ogni ${m[1]} anni`;
  m = recur.match(/^months:(\d+)$/);
  if (m) return m[1] === '1' ? 'Ogni mese' : `Ogni ${m[1]} mesi`;
  m = recur.match(/^yearly-fixed:(\d{2})-(\d{2})$/);
  if (m) return `Ogni anno il ${Number(m[2])} ${MONTHS[Number(m[1]) - 1]}`;
  return recur;
}

export const RECUR_OPTIONS = [
  ['once', 'Una volta'],
  ['months:1', 'Ogni mese'],
  ['months:6', 'Ogni 6 mesi'],
  ['years:1', 'Ogni anno'],
  ['years:2', 'Ogni 2 anni'],
  ['years:4', 'Ogni 4 anni'],
  ['years:5', 'Ogni 5 anni'],
  ['years:10', 'Ogni 10 anni'],
];

export function addMonthsEnd(iso, months) {
  const d = parseDate(iso);
  const end = new Date(d.getFullYear(), d.getMonth() + months + 1, 0);
  return toIso(end);
}

export function addYears(iso, years) {
  const d = parseDate(iso);
  return toIso(new Date(d.getFullYear() + years, d.getMonth(), d.getDate()));
}

export function ageAt(birthIso, atIso) {
  if (!birthIso) return null;
  const b = parseDate(birthIso);
  const a = parseDate(atIso);
  let age = a.getFullYear() - b.getFullYear();
  if (a.getMonth() < b.getMonth() || (a.getMonth() === b.getMonth() && a.getDate() < b.getDate())) age--;
  return age;
}

/** Revisione: prima a 4 anni dall'immatricolazione (fine mese), poi ogni 2 anni. */
export function nextRevisione(firstRegIso) {
  if (!firstRegIso) return null;
  const today = todayIso();
  let due = addMonthsEnd(firstRegIso, 48);
  while (due < today) due = addMonthsEnd(due, 24);
  return due;
}

/** Bollo: scade alla fine del mese di immatricolazione, ogni anno. */
export function nextBollo(firstRegIso) {
  if (!firstRegIso) return null;
  const today = todayIso();
  const reg = parseDate(firstRegIso);
  const now = new Date();
  let due = toIso(new Date(now.getFullYear(), reg.getMonth() + 1, 0));
  if (due < today) due = toIso(new Date(now.getFullYear() + 1, reg.getMonth() + 1, 0));
  return due;
}

/** Validità CIE per età al rilascio (Ministero dell'Interno). */
export function cieYears(age) {
  if (age == null) return null;
  if (age < 3) return 3;
  if (age < 18) return 5;
  return 10;
}

/** Validità patente AM/A/B per età al rinnovo (MIT). */
export function patenteBYears(age) {
  if (age == null) return null;
  if (age < 50) return 10;
  if (age < 70) return 5;
  if (age < 80) return 3;
  return 2;
}

export function relationLabel(r) {
  return { io: 'Io', partner: 'Partner', figlio: 'Figlio/a', genitore: 'Genitore', famiglia: 'Famiglia', altro: 'Altro' }[r] || r;
}
