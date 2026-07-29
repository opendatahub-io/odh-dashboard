const BINARY_SUFFIXES: Record<string, number> = {
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  Pi: 1024 ** 5,
  Ei: 1024 ** 6,
};

const DECIMAL_SUFFIXES: Record<string, number> = {
  n: 1e-9,
  u: 1e-6,
  m: 1e-3,
  k: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: 1e18,
};

// Matches: optional sign, number (with optional decimal), suffix (letters only) or exponent (e/E + signed int)
const QUANTITY_RE = /^([+-]?\d*\.?\d*\.?)([A-Za-z]*)$/;
const EXPONENT_RE = /^([+-]?\d*\.?\d*\.?)[eE]([+-]?\d+)$/;

// Parses a Kubernetes resource.Quantity string into a numeric base-unit value.
const parseK8sQuantity = (value: string | number | undefined): number => {
  if (value == null) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  // Try decimal exponent form first (e.g., "129e6", "100E-3")
  const expMatch = trimmed.match(EXPONENT_RE);
  if (expMatch && expMatch[1]) {
    const base = parseFloat(expMatch[1]);
    const exp = parseInt(expMatch[2], 10);
    return base * 10 ** exp;
  }

  const match = trimmed.match(QUANTITY_RE);
  if (!match || !match[1] || match[1] === '.' || match[1] === '+' || match[1] === '-') {
    return 0;
  }

  const num = parseFloat(match[1]);
  if (Number.isNaN(num)) {
    return 0;
  }

  const suffix = match[2];
  if (!suffix) {
    return num;
  }
  if (suffix in BINARY_SUFFIXES) {
    return num * BINARY_SUFFIXES[suffix];
  }
  if (suffix in DECIMAL_SUFFIXES) {
    return num * DECIMAL_SUFFIXES[suffix];
  }

  return num;
};

export default parseK8sQuantity;
