export function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

export function formatOptionalNumber(value: number | null | undefined) {
  return typeof value === 'number' ? formatNumber(value) : '-'
}

export function formatOptionalPercent(value: number | null | undefined) {
  return typeof value === 'number' ? formatPercent(value) : '-'
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
