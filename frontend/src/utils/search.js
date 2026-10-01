export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchesSearch(query, ...values) {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean);
  if (!terms.length) return true;
  const searchable = normalizeSearchText(values.filter(Boolean).join(' '));
  return terms.every((term) => searchable.includes(term));
}
