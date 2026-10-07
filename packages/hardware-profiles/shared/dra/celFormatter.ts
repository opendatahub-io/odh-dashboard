import { DeviceFilterOperator, type DeviceFilter, type DeviceFilterClause } from './types';

/** Restricted CEL formatter: equality, startsWith, quantity comparison, `&&`; never evaluated. */

type PunctValue = '.' | '[' | ']' | '(' | ')';
type OpValue = '==' | '!=' | '>' | '>=' | '<' | '<=' | '&&';

type Token =
  | { type: 'ident'; value: string }
  | { type: 'string'; value: string }
  | { type: 'number'; value: string }
  | { type: 'punct'; value: PunctValue }
  | { type: 'op'; value: OpValue };

const PUNCT = new Set<string>(['.', '[', ']', '(', ')']);
const OPS = new Set<string>(['==', '!=', '>=', '<=', '&&', '>', '<']);
const isPunctValue = (text: string): text is PunctValue => PUNCT.has(text);
const isOpValue = (text: string): text is OpValue => OPS.has(text);
const ESCAPES: Partial<Record<string, string>> = {
  n: '\n',
  t: '\t',
  '"': '"',
  "'": "'",
  '\\': '\\',
};

const isIdentStart = (c: string): boolean => /[A-Za-z_]/.test(c);
const isIdentPart = (c: string): boolean => /[A-Za-z0-9_]/.test(c);
const isDigit = (c: string): boolean => /[0-9]/.test(c);

/** Returns undefined on any character outside the supported subset. */
const tokenize = (expression: string): Token[] | undefined => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expression.length) {
    const c = expression[i];
    const pair = expression.slice(i, i + 2);
    if (/\s/.test(c)) {
      i += 1;
    } else if (isIdentStart(c)) {
      let j = i + 1;
      while (j < expression.length && isIdentPart(expression[j])) {
        j += 1;
      }
      tokens.push({ type: 'ident', value: expression.slice(i, j) });
      i = j;
    } else if (isDigit(c)) {
      const match = /^\d+(\.\d+)?/.exec(expression.slice(i));
      if (!match || isIdentPart(expression.charAt(i + match[0].length))) {
        return undefined;
      }
      tokens.push({ type: 'number', value: match[0] });
      i += match[0].length;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      let value = '';
      while (j < expression.length && expression[j] !== c) {
        if (expression[j] === '\\') {
          if (j + 1 >= expression.length) {
            return undefined;
          }
          const escaped = ESCAPES[expression[j + 1]];
          if (escaped === undefined) {
            return undefined;
          }
          value += escaped;
          j += 2;
        } else {
          value += expression[j];
          j += 1;
        }
      }
      if (j >= expression.length) {
        return undefined;
      }
      tokens.push({ type: 'string', value });
      i = j + 1;
    } else if (isPunctValue(c)) {
      tokens.push({ type: 'punct', value: c });
      i += 1;
    } else if (isOpValue(pair)) {
      tokens.push({ type: 'op', value: pair });
      i += 2;
    } else if (isOpValue(c)) {
      tokens.push({ type: 'op', value: c });
      i += 1;
    } else {
      return undefined;
    }
  }
  return tokens;
};

type Access = { attribute: string; category: DeviceFilterClause['category'] };
type Literal = { value: string; valueType: DeviceFilterClause['valueType'] };

const COMPARE_TO_OPERATORS: Partial<Record<OpValue, DeviceFilterOperator>> = {
  '==': DeviceFilterOperator.EQUALS,
  '!=': DeviceFilterOperator.NOT_EQUALS,
  '>': DeviceFilterOperator.GREATER_THAN,
  '>=': DeviceFilterOperator.GREATER_THAN_OR_EQUAL,
  '<': DeviceFilterOperator.LESS_THAN,
  '<=': DeviceFilterOperator.LESS_THAN_OR_EQUAL,
};

/** Thrown internally to abort parsing; callers see `undefined`. */
class UnsupportedExpression extends Error {}

/** Parenthesis nesting cap; the parser recurses per group, so this bounds stack use. */
const MAX_NESTING_DEPTH = 32;

class Parser {
  private pos = 0;

  private depth = 0;

  constructor(private readonly tokens: Token[]) {}

  parseExpression(): DeviceFilterClause[] {
    const clauses = this.parseConjunction();
    if (this.pos < this.tokens.length) {
      throw new UnsupportedExpression();
    }
    return clauses;
  }

  /** `clause && clause ...`; stops before `)` or end of input. */
  private parseConjunction(): DeviceFilterClause[] {
    const clauses = this.parseClause();
    while (this.pos < this.tokens.length && !this.isPunct(this.peek(), ')')) {
      this.expectOp('&&');
      clauses.push(...this.parseClause());
    }
    return clauses;
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  private next(): Token {
    if (this.pos >= this.tokens.length) {
      throw new UnsupportedExpression();
    }
    const token = this.tokens[this.pos];
    this.pos += 1;
    return token;
  }

  private isPunct(token: Token | undefined, value: string): boolean {
    return token?.type === 'punct' && token.value === value;
  }

  private expectPunct(value: string): void {
    if (!this.isPunct(this.next(), value)) {
      throw new UnsupportedExpression();
    }
  }

  private expectOp(value: string): void {
    const token = this.next();
    if (token.type !== 'op' || token.value !== value) {
      throw new UnsupportedExpression();
    }
  }

  private expectIdent(value?: string): string {
    const token = this.next();
    if (token.type !== 'ident' || (value !== undefined && token.value !== value)) {
      throw new UnsupportedExpression();
    }
    return token.value;
  }

  private expectString(): string {
    const token = this.next();
    if (token.type !== 'string') {
      throw new UnsupportedExpression();
    }
    return token.value;
  }

  /** A parenthesised group may hold a whole conjunction, so a clause yields one or more. */
  private parseClause(): DeviceFilterClause[] {
    if (this.isPunct(this.peek(), '(')) {
      this.next();
      this.depth += 1;
      if (this.depth > MAX_NESTING_DEPTH) {
        throw new UnsupportedExpression();
      }
      const clauses = this.parseConjunction();
      this.expectPunct(')');
      this.depth -= 1;
      return clauses;
    }
    const access = this.parseAccess();
    const token = this.next();
    if (token.type === 'op' && (token.value === '==' || token.value === '!=')) {
      const literal = this.parseLiteral();
      return [
        {
          ...access,
          operator:
            token.value === '==' ? DeviceFilterOperator.EQUALS : DeviceFilterOperator.NOT_EQUALS,
          ...literal,
        },
      ];
    }
    if (this.isPunct(token, '.')) {
      return [this.parseMethodClause(access)];
    }
    throw new UnsupportedExpression();
  }

  /** `device.attributes["d"].n`, `device.attributes["d"]["n"]`, `device.capacity[...]`, `device.driver`. */
  private parseAccess(): Access {
    this.expectIdent('device');
    this.expectPunct('.');
    const field = this.expectIdent();
    if (field === 'driver') {
      return { attribute: 'driver', category: 'driver' };
    }
    if (field !== 'attributes' && field !== 'capacity') {
      throw new UnsupportedExpression();
    }
    this.expectPunct('[');
    const domain = this.expectString();
    this.expectPunct(']');
    let name: string;
    if (this.isPunct(this.peek(), '[')) {
      this.next();
      name = this.expectString();
      this.expectPunct(']');
    } else {
      this.expectPunct('.');
      name = this.expectIdent();
    }
    return {
      attribute: `${domain}/${name}`,
      category: field === 'attributes' ? 'attribute' : 'capacity',
    };
  }

  private parseLiteral(): Literal {
    const token = this.next();
    if (token.type === 'string') {
      return { value: token.value, valueType: 'string' };
    }
    if (token.type === 'number') {
      return { value: token.value, valueType: 'number' };
    }
    if (token.type === 'ident' && (token.value === 'true' || token.value === 'false')) {
      return { value: token.value, valueType: 'boolean' };
    }
    if (token.type === 'ident' && token.value === 'quantity') {
      return { value: this.parseQuantityArgs(), valueType: 'quantity' };
    }
    throw new UnsupportedExpression();
  }

  /** Consumes `("40Gi")` after the `quantity` identifier. */
  private parseQuantityArgs(): string {
    this.expectPunct('(');
    const value = this.expectString();
    this.expectPunct(')');
    return value;
  }

  private parseQuantityCall(): string {
    this.expectIdent('quantity');
    return this.parseQuantityArgs();
  }

  private parseMethodClause(access: Access): DeviceFilterClause {
    const method = this.expectIdent();
    this.expectPunct('(');
    if (method === 'startsWith') {
      const value = this.expectString();
      this.expectPunct(')');
      return { ...access, operator: DeviceFilterOperator.STARTS_WITH, value, valueType: 'string' };
    }
    if (method === 'isGreaterThan' || method === 'isLessThan') {
      const value = this.parseQuantityCall();
      this.expectPunct(')');
      return {
        ...access,
        operator:
          method === 'isGreaterThan'
            ? DeviceFilterOperator.GREATER_THAN
            : DeviceFilterOperator.LESS_THAN,
        value,
        valueType: 'quantity',
      };
    }
    if (method === 'compareTo') {
      const value = this.parseQuantityCall();
      this.expectPunct(')');
      const op = this.next();
      const zero = this.next();
      if (op.type !== 'op' || zero.type !== 'number' || zero.value !== '0') {
        throw new UnsupportedExpression();
      }
      const operator = COMPARE_TO_OPERATORS[op.value];
      if (!operator) {
        throw new UnsupportedExpression();
      }
      return { ...access, operator, value, valueType: 'quantity' };
    }
    throw new UnsupportedExpression();
  }
}

/** Parses a selector expression into clauses, or undefined when any part is unsupported. */
export const parseDeviceSelectorExpression = (
  expression: string,
): DeviceFilterClause[] | undefined => {
  const tokens = tokenize(expression);
  if (!tokens || tokens.length === 0) {
    return undefined;
  }
  try {
    return new Parser(tokens).parseExpression();
  } catch (e) {
    if (e instanceof UnsupportedExpression) {
      return undefined;
    }
    throw e;
  }
};

export const toDeviceFilter = (expression: string | undefined): DeviceFilter => {
  const clauses = expression === undefined ? undefined : parseDeviceSelectorExpression(expression);
  return clauses ? { type: 'supported', clauses } : { type: 'unsupported' };
};

/** e.g. `gpu.nvidia.com/productName starts with "NVIDIA A100"` or `gpu.nvidia.com/memory ≥ 40Gi`. */
export const formatDeviceFilterClause = (clause: DeviceFilterClause): string => {
  const value = clause.valueType === 'string' ? JSON.stringify(clause.value) : clause.value;
  return `${clause.attribute} ${clause.operator} ${value}`;
};
