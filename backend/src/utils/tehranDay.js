const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

function getTehranParts(date = new Date()) {
  const tehranTime = new Date(date.getTime() + TEHRAN_OFFSET_MS);
  return {
    year: tehranTime.getUTCFullYear(),
    month: tehranTime.getUTCMonth(),
    day: tehranTime.getUTCDate(),
  };
}

export function getTehranDayBounds(date = new Date()) {
  const { year, month, day } = getTehranParts(date);
  const startUtcMs = Date.UTC(year, month, day, 0, 0, 0, 0) - TEHRAN_OFFSET_MS;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;
  return {
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(endUtcMs).toISOString(),
  };
}

export default getTehranDayBounds;
