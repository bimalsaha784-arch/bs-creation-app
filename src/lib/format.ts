export function formatPrice(amount: number | string | null | undefined, currency = "INR") {
  const n = Number(amount ?? 0);
  if (n === 0) return "Free";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
}

export function effectivePrice(c: { price: number; discount_price: number | null }) {
  return c.discount_price != null && c.discount_price < c.price ? c.discount_price : c.price;
}

export function discountPct(c: { price: number; discount_price: number | null }) {
  if (c.discount_price == null || c.discount_price >= c.price || !c.price) return 0;
  return Math.round(((c.price - c.discount_price) / c.price) * 100);
}

export function firstName(fullName: string | null | undefined) {
  return (fullName ?? "").trim().split(/\s+/)[0] ?? "";
}
