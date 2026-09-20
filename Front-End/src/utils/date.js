export function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function formatTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(new Date(value));
}
