import parseK8sQuantity from '../parseK8sQuantity';

describe('parseK8sQuantity', () => {
  it('should return 0 for null/undefined', () => {
    expect(parseK8sQuantity(undefined)).toBe(0);
    expect(parseK8sQuantity(null as unknown as undefined)).toBe(0);
  });

  it('should return the number directly for numeric inputs', () => {
    expect(parseK8sQuantity(0)).toBe(0);
    expect(parseK8sQuantity(42)).toBe(42);
    expect(parseK8sQuantity(3.14)).toBe(3.14);
    expect(parseK8sQuantity(-1)).toBe(-1);
  });

  it('should parse plain numeric strings', () => {
    expect(parseK8sQuantity('0')).toBe(0);
    expect(parseK8sQuantity('100')).toBe(100);
    expect(parseK8sQuantity('3.5')).toBe(3.5);
    expect(parseK8sQuantity('-7')).toBe(-7);
    expect(parseK8sQuantity('+5')).toBe(5);
  });

  describe('binary SI suffixes', () => {
    it('should parse Ki (kibibytes)', () => {
      expect(parseK8sQuantity('1Ki')).toBe(1024);
      expect(parseK8sQuantity('4Ki')).toBe(4096);
    });

    it('should parse Mi (mebibytes)', () => {
      expect(parseK8sQuantity('1Mi')).toBe(1024 ** 2);
      expect(parseK8sQuantity('512Mi')).toBe(512 * 1024 ** 2);
    });

    it('should parse Gi (gibibytes)', () => {
      expect(parseK8sQuantity('1Gi')).toBe(1024 ** 3);
      expect(parseK8sQuantity('64Gi')).toBe(64 * 1024 ** 3);
      expect(parseK8sQuantity('128Gi')).toBe(128 * 1024 ** 3);
    });

    it('should parse Ti, Pi, Ei', () => {
      expect(parseK8sQuantity('1Ti')).toBe(1024 ** 4);
      expect(parseK8sQuantity('1Pi')).toBe(1024 ** 5);
      expect(parseK8sQuantity('1Ei')).toBe(1024 ** 6);
    });
  });

  describe('decimal SI suffixes', () => {
    it('should parse m (milli)', () => {
      expect(parseK8sQuantity('500m')).toBeCloseTo(0.5);
      expect(parseK8sQuantity('100m')).toBeCloseTo(0.1);
      expect(parseK8sQuantity('1000m')).toBeCloseTo(1);
    });

    it('should parse k (kilo)', () => {
      expect(parseK8sQuantity('1k')).toBe(1000);
      expect(parseK8sQuantity('2.5k')).toBe(2500);
    });

    it('should parse M (mega)', () => {
      expect(parseK8sQuantity('1M')).toBe(1e6);
    });

    it('should parse G (giga)', () => {
      expect(parseK8sQuantity('1G')).toBe(1e9);
    });

    it('should parse n and u (nano, micro)', () => {
      expect(parseK8sQuantity('1n')).toBeCloseTo(1e-9);
      expect(parseK8sQuantity('1u')).toBeCloseTo(1e-6);
    });

    it('should parse T, P, E', () => {
      expect(parseK8sQuantity('1T')).toBe(1e12);
      expect(parseK8sQuantity('1P')).toBe(1e15);
      expect(parseK8sQuantity('1E')).toBe(1e18);
    });
  });

  describe('decimal exponent notation', () => {
    it('should parse positive exponents', () => {
      expect(parseK8sQuantity('129e6')).toBe(129_000_000);
      expect(parseK8sQuantity('1e3')).toBe(1000);
    });

    it('should parse negative exponents', () => {
      expect(parseK8sQuantity('1e-3')).toBeCloseTo(0.001);
      expect(parseK8sQuantity('500E-3')).toBeCloseTo(0.5);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty string', () => {
      expect(parseK8sQuantity('')).toBe(0);
    });

    it('should return 0 for whitespace-only strings', () => {
      expect(parseK8sQuantity('  ')).toBe(0);
    });

    it('should return 0 for invalid strings', () => {
      expect(parseK8sQuantity('abc')).toBe(0);
      expect(parseK8sQuantity('Gi')).toBe(0);
    });

    it('should handle leading dot notation', () => {
      expect(parseK8sQuantity('.5Gi')).toBe(0.5 * 1024 ** 3);
    });

    it('should handle unknown suffixes by returning the number', () => {
      expect(parseK8sQuantity('100x')).toBe(100);
    });

    it('should handle signed quantities', () => {
      expect(parseK8sQuantity('-64Gi')).toBe(-64 * 1024 ** 3);
      expect(parseK8sQuantity('+500m')).toBeCloseTo(0.5);
    });
  });

  describe('real-world Kueue values', () => {
    it('should correctly parse typical ClusterQueue quota values', () => {
      // CPU quota (plain cores)
      expect(parseK8sQuantity('100')).toBe(100);
      // Memory quota
      expect(parseK8sQuantity('64Gi')).toBe(64 * 1024 ** 3);
      // GPU count
      expect(parseK8sQuantity('8')).toBe(8);
      // CPU in millicores
      expect(parseK8sQuantity('200m')).toBeCloseTo(0.2);
    });

    it('should produce correct sums within the same resource type', () => {
      const mem1 = parseK8sQuantity('64Gi');
      const mem2 = parseK8sQuantity('128Gi');
      expect(mem1 + mem2).toBe(192 * 1024 ** 3);
    });
  });
});
