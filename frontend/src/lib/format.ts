export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

/** "a", "a and b", "a, b and c" */
export function joinNatural(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export const capitalise = (s: string): string => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

export function countWord(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six"];
export const numberWord = (n: number): string => NUMBER_WORDS[n] ?? String(n);
