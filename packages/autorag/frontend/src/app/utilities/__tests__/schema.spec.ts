import * as z from 'zod';
import { createSchema } from '~/app/utilities/schema';

describe('createSchema', () => {
  describe('basic schema without validators or transformers', () => {
    it('should create schema with base, full, and defaults', () => {
      const schema = z.object({
        name: z.string().default('test'),
        age: z.number().default(0),
      });

      const result = createSchema({ schema });

      expect(result).toHaveProperty('base');
      expect(result).toHaveProperty('full');
      expect(result).toHaveProperty('defaults');
    });

    it('should extract default values from schema', () => {
      const schema = z.object({
        name: z.string().default('John'),
        age: z.number().default(25),
        active: z.boolean().default(true),
      });

      const result = createSchema({ schema });

      expect(result.defaults).toEqual({
        name: 'John',
        age: 25,
        active: true,
      });
    });

    it('should handle schema with no defaults', () => {
      const schema = z.object({
        name: z.string().optional(),
        age: z.number().optional(),
      });

      const result = createSchema({ schema });

      expect(result.defaults).toEqual({});
    });

    it('should return base schema that validates correctly', () => {
      const schema = z.object({
        name: z.string().default(''),
        age: z.number().default(0),
      });

      const result = createSchema({ schema });

      const validData = { name: 'Alice', age: 30 };
      expect(() => result.base.parse(validData)).not.toThrow();
      expect(result.base.parse(validData)).toEqual(validData);
    });

    it('should return full schema that validates correctly without validators', () => {
      const schema = z.object({
        name: z.string().default(''),
        age: z.number().default(0),
      });

      const result = createSchema({ schema });

      const validData = { name: 'Bob', age: 40 };
      expect(() => result.full.parse(validData)).not.toThrow();
      expect(result.full.parse(validData)).toEqual(validData);
    });
  });

  describe('schema with validators', () => {
    it('should apply custom validators', () => {
      const schema = z.object({
        age: z.number().default(0),
      });

      const validators = [
        (data: { age: number }) => {
          if (data.age < 0) {
            return [
              {
                code: z.ZodIssueCode.custom,
                path: ['age'],
                message: 'Age must be non-negative',
                input: data.age,
              },
            ];
          }
          return [];
        },
      ];

      const result = createSchema({ schema, validators });

      expect(() => result.full.parse({ age: -5 })).toThrow('Age must be non-negative');
      expect(() => result.full.parse({ age: 25 })).not.toThrow();
    });

    it('should apply multiple validators', () => {
      const schema = z.object({
        age: z.number().default(0),
      });

      const validators = [
        (data: { age: number }) => {
          if (data.age < 0) {
            return [
              {
                code: z.ZodIssueCode.custom,
                path: ['age'],
                message: 'Age must be non-negative',
                input: data.age,
              },
            ];
          }
          return [];
        },
        (data: { age: number }) => {
          if (data.age > 150) {
            return [
              {
                code: z.ZodIssueCode.custom,
                path: ['age'],
                message: 'Age must be less than or equal to 150',
                input: data.age,
              },
            ];
          }
          return [];
        },
      ];

      const result = createSchema({ schema, validators });

      expect(() => result.full.parse({ age: -5 })).toThrow('Age must be non-negative');
      expect(() => result.full.parse({ age: 200 })).toThrow(
        'Age must be less than or equal to 150',
      );
      expect(() => result.full.parse({ age: 50 })).not.toThrow();
    });

    it('should not apply validators to base schema', () => {
      const schema = z.object({
        age: z.number().default(0),
      });

      const validators = [
        (data: { age: number }) => {
          if (data.age < 0) {
            return [
              {
                code: z.ZodIssueCode.custom,
                path: ['age'],
                message: 'Age must be non-negative',
                input: data.age,
              },
            ];
          }
          return [];
        },
      ];

      const result = createSchema({ schema, validators });

      // Base schema should not have custom validators
      expect(() => result.base.parse({ age: -5 })).not.toThrow();
      // Full schema should have validators
      expect(() => result.full.parse({ age: -5 })).toThrow('Age must be non-negative');
    });

    it('should collect all validation errors from all validators', () => {
      const schema = z.object({
        name: z.string().default(''),
        age: z.number().default(0),
      });

      const validators = [
        (data: { name: string; age: number }) => {
          const issues = [];
          if (data.name.length < 2) {
            issues.push({
              code: z.ZodIssueCode.custom,
              path: ['name'],
              message: 'Name must be at least 2 characters',
              input: data.name,
            });
          }
          return issues;
        },
        (data: { name: string; age: number }) => {
          const issues = [];
          if (data.age < 18) {
            issues.push({
              code: z.ZodIssueCode.custom,
              path: ['age'],
              message: 'Age must be at least 18',
              input: data.age,
            });
          }
          return issues;
        },
      ];

      const result = createSchema({ schema, validators });

      expect(() => result.full.parse({ name: 'A', age: 10 })).toThrow();
    });
  });

  describe('schema with transformers', () => {
    it('should apply single transformer', () => {
      const schema = z.object({
        name: z.string().default(''),
      });

      const transformers = [
        (data: { name: string }) => ({ ...data, name: data.name.toUpperCase() }),
      ];

      const result = createSchema({ schema, transformers });

      const parsed = result.full.parse({ name: 'alice' });
      expect(parsed.name).toBe('ALICE');
    });

    it('should apply multiple transformers in sequence', () => {
      const schema = z.object({
        value: z.number().default(0),
      });

      const transformers = [
        (data: { value: number }) => ({ ...data, value: data.value * 2 }), // double it
        (data: { value: number }) => ({ ...data, value: data.value + 10 }), // add 10
      ];

      const result = createSchema({ schema, transformers });

      const parsed = result.full.parse({ value: 5 });
      expect(parsed.value).toBe(20); // (5 * 2) + 10 = 20
    });

    it('should not apply transformers to base schema', () => {
      const schema = z.object({
        name: z.string().default(''),
      });

      const transformers = [
        (data: { name: string }) => ({ ...data, name: data.name.toUpperCase() }),
      ];

      const result = createSchema({ schema, transformers });

      const baseParsed = result.base.parse({ name: 'alice' });
      expect(baseParsed.name).toBe('alice'); // Not transformed

      const fullParsed = result.full.parse({ name: 'alice' });
      expect(fullParsed.name).toBe('ALICE'); // Transformed
    });

    it('should apply transformers that add new fields', () => {
      const schema = z.object({
        firstName: z.string().default(''),
        lastName: z.string().default(''),
      });

      const transformers = [
        (data: { firstName: string; lastName: string }) => ({
          ...data,
          fullName: `${data.firstName} ${data.lastName}`,
        }),
      ];

      const result = createSchema({ schema, transformers });

      const parsed = result.full.parse({ firstName: 'John', lastName: 'Doe' });
      expect(parsed).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
      });
    });

    it('should apply transformers that remove fields', () => {
      const schema = z.object({
        name: z.string().default(''),
        temp: z.string().optional(),
      });

      const transformers = [
        (data: { name: string; temp?: string }) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { temp, ...rest } = data;
          return rest;
        },
      ];

      const result = createSchema({ schema, transformers });

      const parsed = result.full.parse({ name: 'Alice', temp: 'temporary' });
      expect(parsed).toEqual({ name: 'Alice' });
      expect(parsed).not.toHaveProperty('temp');
    });
  });

  describe('schema with both validators and transformers', () => {
    it('should apply validators before transformers', () => {
      const schema = z.object({
        age: z.number().default(0),
      });

      const validators = [
        (data: { age: number }) => {
          if (data.age < 0) {
            return [
              {
                code: z.ZodIssueCode.custom,
                path: ['age'],
                message: 'Age must be non-negative',
                input: data.age,
              },
            ];
          }
          return [];
        },
      ];

      const transformers = [(data: { age: number }) => ({ ...data, age: data.age * 2 })];

      const result = createSchema({ schema, validators, transformers });

      // Should fail validation before transformation
      expect(() => result.full.parse({ age: -5 })).toThrow('Age must be non-negative');

      // Should validate then transform
      const parsed = result.full.parse({ age: 10 });
      expect(parsed.age).toBe(20);
    });

    it('should apply all validators and all transformers', () => {
      const schema = z.object({
        name: z.string().default(''),
        age: z.number().default(0),
      });

      const validators = [
        (data: { name: string; age: number }) => {
          if (data.name.length < 2) {
            return [
              {
                code: z.ZodIssueCode.custom,
                path: ['name'],
                message: 'Name must be at least 2 characters',
                input: data.name,
              },
            ];
          }
          return [];
        },
        (data: { name: string; age: number }) => {
          if (data.age < 0) {
            return [
              {
                code: z.ZodIssueCode.custom,
                path: ['age'],
                message: 'Age must be non-negative',
                input: data.age,
              },
            ];
          }
          return [];
        },
      ];

      const transformers = [
        (data: { name: string; age: number }) => ({ ...data, name: data.name.toUpperCase() }),
        (data: { name: string; age: number }) => ({ ...data, age: data.age + 1 }),
      ];

      const result = createSchema({ schema, validators, transformers });

      const parsed = result.full.parse({ name: 'alice', age: 25 });
      expect(parsed).toEqual({
        name: 'ALICE',
        age: 26,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty validators array', () => {
      const schema = z.object({
        name: z.string().default(''),
      });

      const result = createSchema({ schema, validators: [] });

      expect(() => result.full.parse({ name: 'test' })).not.toThrow();
    });

    it('should handle empty transformers array', () => {
      const schema = z.object({
        name: z.string().default(''),
      });

      const result = createSchema({ schema, transformers: [] });

      const parsed = result.full.parse({ name: 'test' });
      expect(parsed.name).toBe('test');
    });

    it('should handle validator that returns empty array', () => {
      const schema = z.object({
        name: z.string().default(''),
      });

      const validators = [() => []]; // Always returns no issues

      const result = createSchema({ schema, validators });

      expect(() => result.full.parse({ name: 'test' })).not.toThrow();
    });

    it('should handle complex nested schemas', () => {
      const schema = z.object({
        user: z
          .object({
            name: z.string().default('Unknown'),
            settings: z
              .object({
                theme: z.string().default('light'),
                notifications: z.boolean().default(true),
              })
              .default({ theme: 'light', notifications: true }),
          })
          .default({ name: 'Unknown', settings: { theme: 'light', notifications: true } }),
      });

      const result = createSchema({ schema });

      expect(result.defaults).toEqual({
        user: {
          name: 'Unknown',
          settings: {
            theme: 'light',
            notifications: true,
          },
        },
      });
    });
  });
});
