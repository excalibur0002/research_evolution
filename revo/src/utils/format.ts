export function formatNumber(value: number): string {
  if (value >= 1000) {
    return value.toFixed(1);
  }

  return value.toFixed(1);
}
