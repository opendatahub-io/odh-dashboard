import {
  formatDeviceFilterClause,
  parseDeviceSelectorExpression,
  toDeviceFilter,
} from '../celFormatter';
import { DeviceFilterOperator, type DeviceFilterClause } from '../types';

const attr = (
  attribute: string,
  operator: DeviceFilterOperator,
  value: string,
  valueType: DeviceFilterClause['valueType'] = 'string',
  category: DeviceFilterClause['category'] = 'attribute',
): DeviceFilterClause => ({ attribute, category, operator, value, valueType });

const nest = (depth: number, inner: string): string =>
  `${'('.repeat(depth)}${inner}${')'.repeat(depth)}`;

describe('parseDeviceSelectorExpression', () => {
  describe('supported expressions', () => {
    it.each<[string, string, DeviceFilterClause[]]>([
      [
        'string equality',
        'device.attributes["gpu.nvidia.com"].productName == "NVIDIA A100-SXM4-40GB"',
        [attr('gpu.nvidia.com/productName', DeviceFilterOperator.EQUALS, 'NVIDIA A100-SXM4-40GB')],
      ],
      [
        'string inequality',
        "device.attributes['gpu.nvidia.com'].type != 'mig'",
        [attr('gpu.nvidia.com/type', DeviceFilterOperator.NOT_EQUALS, 'mig')],
      ],
      [
        'bracket attribute name',
        'device.attributes["gpu.nvidia.com"]["productName"] == "NVIDIA H100"',
        [attr('gpu.nvidia.com/productName', DeviceFilterOperator.EQUALS, 'NVIDIA H100')],
      ],
      [
        'integer equality',
        'device.attributes["gpu.nvidia.com"].cudaComputeCapabilityMajor == 9',
        [
          attr(
            'gpu.nvidia.com/cudaComputeCapabilityMajor',
            DeviceFilterOperator.EQUALS,
            '9',
            'number',
          ),
        ],
      ],
      [
        'boolean equality',
        'device.attributes["gpu.nvidia.com"].migEnabled == true',
        [attr('gpu.nvidia.com/migEnabled', DeviceFilterOperator.EQUALS, 'true', 'boolean')],
      ],
      [
        'driver equality',
        'device.driver == "gpu.nvidia.com"',
        [attr('driver', DeviceFilterOperator.EQUALS, 'gpu.nvidia.com', 'string', 'driver')],
      ],
      [
        'startsWith',
        'device.attributes["gpu.nvidia.com"].productName.startsWith("NVIDIA A100")',
        [attr('gpu.nvidia.com/productName', DeviceFilterOperator.STARTS_WITH, 'NVIDIA A100')],
      ],
      [
        'quantity compareTo >= 0 keeps units',
        'device.capacity["gpu.nvidia.com"].memory.compareTo(quantity("40Gi")) >= 0',
        [
          attr(
            'gpu.nvidia.com/memory',
            DeviceFilterOperator.GREATER_THAN_OR_EQUAL,
            '40Gi',
            'quantity',
            'capacity',
          ),
        ],
      ],
      [
        'quantity compareTo < 0',
        'device.capacity["gpu.nvidia.com"].memory.compareTo(quantity("80Gi")) < 0',
        [
          attr(
            'gpu.nvidia.com/memory',
            DeviceFilterOperator.LESS_THAN,
            '80Gi',
            'quantity',
            'capacity',
          ),
        ],
      ],
      [
        'quantity compareTo == 0',
        'device.capacity["gpu.nvidia.com"].memory.compareTo(quantity("40Gi")) == 0',
        [
          attr(
            'gpu.nvidia.com/memory',
            DeviceFilterOperator.EQUALS,
            '40Gi',
            'quantity',
            'capacity',
          ),
        ],
      ],
      [
        'quantity isGreaterThan',
        'device.capacity["gpu.nvidia.com"].memory.isGreaterThan(quantity("16Gi"))',
        [
          attr(
            'gpu.nvidia.com/memory',
            DeviceFilterOperator.GREATER_THAN,
            '16Gi',
            'quantity',
            'capacity',
          ),
        ],
      ],
      [
        'quantity isLessThan',
        'device.capacity["gpu.nvidia.com"].memory.isLessThan(quantity("16Gi"))',
        [
          attr(
            'gpu.nvidia.com/memory',
            DeviceFilterOperator.LESS_THAN,
            '16Gi',
            'quantity',
            'capacity',
          ),
        ],
      ],
      [
        'quantity equality literal',
        'device.capacity["gpu.nvidia.com"].memory == quantity("40Gi")',
        [
          attr(
            'gpu.nvidia.com/memory',
            DeviceFilterOperator.EQUALS,
            '40Gi',
            'quantity',
            'capacity',
          ),
        ],
      ],
      [
        'conjunction preserves clause order',
        'device.attributes["gpu.nvidia.com"].type == "gpu" && device.capacity["gpu.nvidia.com"].memory.compareTo(quantity("40Gi")) >= 0 && device.driver == "gpu.nvidia.com"',
        [
          attr('gpu.nvidia.com/type', DeviceFilterOperator.EQUALS, 'gpu'),
          attr(
            'gpu.nvidia.com/memory',
            DeviceFilterOperator.GREATER_THAN_OR_EQUAL,
            '40Gi',
            'quantity',
            'capacity',
          ),
          attr('driver', DeviceFilterOperator.EQUALS, 'gpu.nvidia.com', 'string', 'driver'),
        ],
      ],
      [
        'parenthesised clauses and whitespace',
        '  (device.attributes["gpu.nvidia.com"].type == "gpu")\n && (device.attributes["gpu.nvidia.com"].productName.startsWith("NVIDIA")) ',
        [
          attr('gpu.nvidia.com/type', DeviceFilterOperator.EQUALS, 'gpu'),
          attr('gpu.nvidia.com/productName', DeviceFilterOperator.STARTS_WITH, 'NVIDIA'),
        ],
      ],
      [
        'escaped quote in string literal',
        'device.attributes["gpu.nvidia.com"].productName == "NVIDIA \\"Ampere\\""',
        [attr('gpu.nvidia.com/productName', DeviceFilterOperator.EQUALS, 'NVIDIA "Ampere"')],
      ],
      [
        'parenthesised conjunction',
        '(device.attributes["gpu.nvidia.com"].type == "gpu" && device.driver == "gpu.nvidia.com")',
        [
          attr('gpu.nvidia.com/type', DeviceFilterOperator.EQUALS, 'gpu'),
          attr('driver', DeviceFilterOperator.EQUALS, 'gpu.nvidia.com', 'string', 'driver'),
        ],
      ],
      [
        'nested parenthesised conjunction',
        '((device.attributes["a"].x == "1") && (device.attributes["a"].y == "2" && device.attributes["a"].z == "3"))',
        [
          attr('a/x', DeviceFilterOperator.EQUALS, '1'),
          attr('a/y', DeviceFilterOperator.EQUALS, '2'),
          attr('a/z', DeviceFilterOperator.EQUALS, '3'),
        ],
      ],
      [
        'decimal number literal',
        'device.attributes["a"].x == 1.5',
        [attr('a/x', DeviceFilterOperator.EQUALS, '1.5', 'number')],
      ],
      [
        'moderately nested parentheses (8 levels)',
        nest(8, 'device.attributes["a"].x == "1"'),
        [attr('a/x', DeviceFilterOperator.EQUALS, '1')],
      ],
      [
        'parentheses nested to the cap (32 levels)',
        nest(32, 'device.attributes["a"].x == "1"'),
        [attr('a/x', DeviceFilterOperator.EQUALS, '1')],
      ],
      [
        'sibling groups each nested to the cap',
        `${nest(32, 'device.attributes["a"].x == "1"')} && ${nest(
          32,
          'device.attributes["a"].y == "2"',
        )}`,
        [
          attr('a/x', DeviceFilterOperator.EQUALS, '1'),
          attr('a/y', DeviceFilterOperator.EQUALS, '2'),
        ],
      ],
      [
        'quantity call parentheses inside a group at the cap',
        nest(32, 'device.capacity["a"].memory.compareTo(quantity("1Gi")) >= 0'),
        [
          attr(
            'a/memory',
            DeviceFilterOperator.GREATER_THAN_OR_EQUAL,
            '1Gi',
            'quantity',
            'capacity',
          ),
        ],
      ],
    ])('should parse %s', (_label, expression, expected) => {
      expect(parseDeviceSelectorExpression(expression)).toEqual(expected);
    });
  });

  describe('unsupported expressions', () => {
    it.each<[string, string]>([
      ['disjunction', 'device.attributes["a"].x == "1" || device.attributes["a"].y == "2"'],
      ['negation', '!(device.attributes["a"].x == "1")'],
      [
        'conjunction with one unsupported clause',
        'device.attributes["a"].x == "1" && has(device.attributes["a"].y)',
      ],
      ['has() macro', 'has(device.attributes["gpu.nvidia.com"].productName)'],
      ['in operator', 'device.attributes["a"].x in ["1", "2"]'],
      ['attribute numeric comparison', 'device.attributes["gpu.nvidia.com"].cudaMajor >= 8'],
      ['compareTo against non-zero', 'device.capacity["a"].memory.compareTo(quantity("1Gi")) >= 1'],
      ['compareTo without quantity', 'device.capacity["a"].memory.compareTo("1Gi") >= 0'],
      ['reversed operands', '"gpu" == device.attributes["gpu.nvidia.com"].type'],
      ['unknown device field', 'device.name == "gpu-0"'],
      ['unknown method', 'device.attributes["a"].x.endsWith("y")'],
      ['literal only', '"gpu"'],
      ['arithmetic', 'device.attributes["a"].x + 1 == 2'],
      ['trailing tokens', 'device.attributes["a"].x == "1" "extra"'],
      ['unterminated string', 'device.attributes["a"].x == "1'],
      ['dangling escape', 'device.attributes["a"].x == "1\\'],
      ['dangling conjunction', 'device.attributes["a"].x == "1" &&'],
      ['unbalanced parenthesis', '(device.attributes["a"].x == "1"'],
      ['unknown escape \\r', 'device.attributes["a"].x == "a\\rb"'],
      ['unicode escape', 'device.attributes["a"].x == "\\u0041"'],
      ['hex escape', 'device.attributes["a"].x == "\\x41"'],
      ['malformed decimal', 'device.attributes["a"].x == 1.2.3'],
      ['trailing dot number', 'device.attributes["a"].x == 1.'],
      ['number glued to identifier', 'device.attributes["a"].x == 1abc'],
      ['empty parentheses', '()'],
      ['stray closing parenthesis', 'device.attributes["a"].x == "1")'],
      ['attribute name without dot', 'device.attributes["a"]x == "1"'],
      ['unquoted domain', 'device.attributes[a].x == "1"'],
      ['identifier as literal', 'device.attributes["a"].x == device'],
      ['compareTo without comparison', 'device.capacity["a"].m.compareTo(quantity("1Gi")) && 0'],
      ['empty expression', ''],
      ['whitespace only', '   '],
      ['parentheses nested past the cap (33 levels)', nest(33, 'device.attributes["a"].x == "1"')],
      ['parentheses nested 5000 deep', nest(5000, 'device.attributes["a"].x == "1"')],
    ])('should return undefined for %s', (_label, expression) => {
      expect(parseDeviceSelectorExpression(expression)).toBeUndefined();
    });
  });
});

describe('toDeviceFilter', () => {
  it('should wrap a supported expression with its clauses', () => {
    expect(toDeviceFilter('device.driver == "gpu.nvidia.com"')).toEqual({
      type: 'supported',
      clauses: [attr('driver', DeviceFilterOperator.EQUALS, 'gpu.nvidia.com', 'string', 'driver')],
    });
  });

  it('should not expose raw text for an unsupported escape', () => {
    const filter = toDeviceFilter('device.attributes["a"].x == "\\u0041"');
    expect(filter).toEqual({ type: 'unsupported' });
    expect(JSON.stringify(filter)).not.toContain('u0041');
  });

  it('should return an unsupported filter without raw text', () => {
    const filter = toDeviceFilter('has(device.attributes["a"].x)');
    expect(filter).toEqual({ type: 'unsupported' });
    expect(JSON.stringify(filter)).not.toContain('has(');
  });

  it('should treat a missing expression as unsupported', () => {
    expect(toDeviceFilter(undefined)).toEqual({ type: 'unsupported' });
  });

  it('should return unsupported without throwing for parentheses nested past the cap', () => {
    const expression = nest(40, 'device.attributes["a"].x == "1"');
    expect(() => toDeviceFilter(expression)).not.toThrow();
    expect(toDeviceFilter(expression)).toEqual({ type: 'unsupported' });
  });
});

describe('formatDeviceFilterClause', () => {
  it.each<[DeviceFilterClause, string]>([
    [
      attr('gpu.nvidia.com/productName', DeviceFilterOperator.EQUALS, 'NVIDIA A100'),
      'gpu.nvidia.com/productName = "NVIDIA A100"',
    ],
    [
      attr('gpu.nvidia.com/productName', DeviceFilterOperator.STARTS_WITH, 'NVIDIA'),
      'gpu.nvidia.com/productName starts with "NVIDIA"',
    ],
    [
      attr(
        'gpu.nvidia.com/memory',
        DeviceFilterOperator.GREATER_THAN_OR_EQUAL,
        '40Gi',
        'quantity',
        'capacity',
      ),
      'gpu.nvidia.com/memory ≥ 40Gi',
    ],
    [
      attr('gpu.nvidia.com/migEnabled', DeviceFilterOperator.NOT_EQUALS, 'true', 'boolean'),
      'gpu.nvidia.com/migEnabled ≠ true',
    ],
    [
      attr('gpu.nvidia.com/cudaMajor', DeviceFilterOperator.EQUALS, '9', 'number'),
      'gpu.nvidia.com/cudaMajor = 9',
    ],
    [
      attr('gpu.nvidia.com/productName', DeviceFilterOperator.EQUALS, 'NVIDIA "Ampere"'),
      'gpu.nvidia.com/productName = "NVIDIA \\"Ampere\\""',
    ],
  ])('should format %j', (clause, expected) => {
    expect(formatDeviceFilterClause(clause)).toBe(expected);
  });
});
