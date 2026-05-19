export function formatCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export const JAR_COLORS: Record<string, string> = {
  NEC: "#10B981",
  LTSS: "#3B82F6",
  EDU: "#8B5CF6",
  PLAY: "#F59E0B",
  FFA: "#EF4444",
  GIVE: "#EC4899",
};