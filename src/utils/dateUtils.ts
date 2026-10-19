// UTC+7 (Vietnam Time)
export function nowVN(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 7 * 3600000);
}

export function parseDateIso(str?: string): Date | null {
  if (!str) return null;
  const s = String(str).trim();
  if (s.includes('/')) {
    const p = s.split('/');
    if (p.length === 3) {
      const d = p[0].padStart(2, '0');
      const m = p[1].padStart(2, '0');
      const y = p[2];
      return new Date(`${y}-${m}-${d}T00:00:00+07:00`);
    }
  } else if (s.includes('-')) {
    const p = s.substring(0, 10).split('-');
    if (p.length === 3) {
      return new Date(`${p[0]}-${p[1]}-${p[2]}T00:00:00+07:00`);
    }
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateDisplay(str?: string): string {
  if (!str) return '';
  const s = String(str).trim();
  if (s.includes('/')) return s;
  const p = s.substring(0, 10).split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return s;
}

export function parseInputDateToIso(ddmmyyyy: string): string {
  if (!ddmmyyyy) return '';
  const p = ddmmyyyy.trim().split('/');
  if (p.length === 3) {
    const d = p[0].padStart(2, '0');
    const m = p[1].padStart(2, '0');
    const y = p[2];
    return `${y}-${m}-${d}`;
  }
  return ddmmyyyy;
}

export function calculateEffort(startDateStr: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  clockText: string;
  formattedStartDate: string;
} {
  const start = parseDateIso(startDateStr);
  const now = nowVN();
  const formattedStartDate = formatDateDisplay(startDateStr);

  if (!start || isNaN(start.getTime()) || now < start) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      clockText: '00 giờ 00 phút 00 giây',
      formattedStartDate,
    };
  }

  const diffMs = now.getTime() - start.getTime();
  const totalSec = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const clockText = `${String(hours).padStart(2, '0')} giờ ${String(minutes).padStart(2, '0')} phút ${String(seconds).padStart(2, '0')} giây`;

  return {
    days,
    hours,
    minutes,
    seconds,
    clockText,
    formattedStartDate,
  };
}
