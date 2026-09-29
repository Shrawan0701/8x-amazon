export function money(cents) {
  return `Rs ${(Number(cents || 0) / 100).toLocaleString('en-IN')}`;
}
