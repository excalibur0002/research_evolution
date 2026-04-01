export function formatNumber(value: number): string {
  const abs = Math.abs(value);

  if (abs < 10) {
    return value.toFixed(2);
  }

  if (abs >= 1000) {
    return value.toFixed(1);
  }

  return value.toFixed(1);
}
