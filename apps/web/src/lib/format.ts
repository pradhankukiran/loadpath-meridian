export function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}
