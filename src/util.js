export function wrap(value) {
  if (value === null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

