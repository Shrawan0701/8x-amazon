export function formatCents(cents) {
  return Number(cents || 0);
}

export function deliveryForSubtotal(subtotalCents) {
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= 499900 ? 0 : 4900;
}
