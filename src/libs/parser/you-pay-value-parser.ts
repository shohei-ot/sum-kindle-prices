export const youPayValueParser = (value: string): number =>
  parseInt(value.replace(',', '').replace(/\D?(\d+)\D?/, '$1'), 10);
