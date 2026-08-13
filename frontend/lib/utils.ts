export function parseUtcDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  
  // If the date string doesn't end with Z and doesn't have an explicit timezone offset,
  // append 'Z' to force the browser to parse it as UTC instead of local time.
  let normalized = dateStr;
  if (!normalized.endsWith('Z') && !normalized.includes('+') && !normalized.match(/-\d{2}:\d{2}$/)) {
    normalized += 'Z';
  }
  
  return new Date(normalized);
}
