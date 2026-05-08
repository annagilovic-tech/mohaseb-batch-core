export const fmtQty = (n: number | string | null | undefined) =>
  n == null ? "" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 3 });
export const fmtMoney = (n: number | string | null | undefined) =>
  n == null ? "" : Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
export const fmtDate = (d: string | null | undefined) => (d ? d.slice(0, 10) : "");
export const daysUntil = (d: string) => Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
