export function money(cents) {
  return `Rs ${(Number(cents || 0) / 100).toLocaleString('en-IN')}`;
}

export function discountPercent(priceCents, oldPriceCents) {
  if (!oldPriceCents || oldPriceCents <= priceCents) return null;
  return Math.round(((oldPriceCents - priceCents) / oldPriceCents) * 100);
}
