/**
 * Konversi waktu dinding (datetime-local) dalam timezone IANA pilihan
 * ke UTC — tanpa dependency tambahan (Intl bawaan).
 * Dipakai form scheduler (client). Pure.
 */

export function tzOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value])
  );
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - date.getTime();
}

/** "2026-09-20" + "14:30" dalam tz → Date UTC. */
export function zonedWallToUtc(date: string, time: string, timeZone: string): Date {
  let guess = new Date(`${date}T${time}:00Z`);
  for (let i = 0; i < 2; i++) {
    guess = new Date(new Date(`${date}T${time}:00Z`).getTime() - tzOffsetMs(timeZone, guess));
  }
  return guess;
}

/** Kunci hari YYYY-MM-DD dari instant UTC dalam tz tertentu. */
export function dayKeyInTz(instant: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dtf.format(instant);
}

/** "14:30" dari instant UTC dalam tz tertentu. */
export function timeInTz(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
}

/** Nilai awal datetime-local dari instant UTC dalam tz ("YYYY-MM-DDTHH:mm"). */
export function toLocalInputValue(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export const COMMON_TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "UTC",
];
