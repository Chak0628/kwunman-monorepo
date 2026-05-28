export function getTaxQuarterKwunman(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const q = Math.ceil(month / 3);
  return `${year} Q${q}`;
}

export function getTaxQuarterGov(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  let govQ: number;
  let govYear: number;
  if (month >= 4) {
    govQ = Math.ceil((month - 3) / 3);
    govYear = year;
  } else {
    govQ = Math.ceil((month + 9) / 3);
    govYear = year - 1;
  }
  return `${govYear}/${String(govYear + 1).slice(2)} 政府Q${govQ}`;
}
