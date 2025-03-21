import { z, ZodIssue } from 'zod';
import { Identifier } from '~/types';
import { isLarger, splitValueUnit, UnitOption } from '~/utilities/valueUnits';

const defaultCountSchema = (identifier: Identifier, unitOptions?: UnitOption[]) =>
  z.union([z.string(), z.number()]).superRefine((defaultCount, ctx) => {
    if (!unitOptions) {
      const defaultVal = Number(defaultCount);
      if (Number.isNaN(defaultVal)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Value must be a number.',
        });
        return;
      }
      if (defaultVal === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Value must be a positive number.',
        });
        return;
      }
      const minCount = Number(identifier.minCount);
      const maxCount = identifier.maxCount !== undefined ? Number(identifier.maxCount) : undefined;

      if (defaultVal < minCount || (maxCount !== undefined && defaultVal > maxCount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Default value must be equal to or between the minimum and maximum allowed limits.',
        });
      }
      return;
    }
    const [defaultVal] = splitValueUnit(String(defaultCount), unitOptions);
    const [minVal] = splitValueUnit(String(identifier.minCount), unitOptions);
    const maxVal =
      identifier.maxCount !== undefined
        ? splitValueUnit(String(identifier.maxCount), unitOptions)[0]
        : undefined;
    if (defaultVal === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Default value must be provided.',
      });
      return;
    }
    if (defaultVal === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Default value must be a positive number.',
      });
      return;
    }
    if (
      (minVal !== undefined &&
        isLarger(String(identifier.minCount), String(defaultCount), unitOptions)) ||
      (maxVal !== undefined &&
        isLarger(String(defaultCount), String(identifier.maxCount), unitOptions))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Default value must be equal to or between the minimum and maximum allowed limits.',
      });
    }
  });

const minCountSchema = (identifier: Identifier, unitOptions?: UnitOption[]) =>
  z.union([z.string(), z.number()]).superRefine((minCount, ctx) => {
    if (!unitOptions) {
      const minVal = Number(minCount);
      if (Number.isNaN(minVal)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Value must be a number.',
        });
        return;
      }
      if (minVal === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Value must be a positive number.',
        });
        return;
      }
      const maxCount = identifier.maxCount !== undefined ? Number(identifier.maxCount) : undefined;
      if (maxCount !== undefined && minVal > maxCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Minimum allowed value cannot exceed the maximum allowed value (if specified).',
        });
      }
      return;
    }
    const [minVal] = splitValueUnit(String(minCount), unitOptions);
    const maxVal =
      identifier.maxCount !== undefined
        ? splitValueUnit(String(identifier.maxCount), unitOptions)[0]
        : undefined;
    if (minVal === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum allowed value must be provided.',
      });
      return;
    }
    if (minVal === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum allowed value must be a positive number.',
      });
      return;
    }
    if (
      maxVal !== undefined &&
      isLarger(String(minCount), String(identifier.maxCount), unitOptions)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum allowed value cannot exceed the maximum allowed value (if specified).',
      });
    }
  });

const maxCountSchema = (unitOptions?: UnitOption[]) =>
  z.union([z.string(), z.number()]).superRefine((maxCount, ctx) => {
    if (!unitOptions) {
      const maxVal = Number(maxCount);
      if (Number.isNaN(maxVal)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Value must be a number.',
        });
        return;
      }
      if (maxVal === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Value must be a positive number.',
        });
        return;
      }
      return;
    }
    const [maxVal] = splitValueUnit(String(maxCount), unitOptions);
    if (maxVal === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum allowed value must be provided.',
      });
      return;
    }
    if (maxVal === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum allowed value must be a positive number.',
      });
    }
  });

export const validateDefaultCount = (
  identifier: Identifier,
  unitOptions?: UnitOption[],
): { isValid: boolean; issues: ZodIssue[] | undefined } => {
  const result = defaultCountSchema(identifier, unitOptions).safeParse(identifier.defaultCount);
  return { isValid: result.success, issues: result.error?.issues };
};

export const validateMinCount = (
  identifier: Identifier,
  unitOptions?: UnitOption[],
): { isValid: boolean; issues: ZodIssue[] | undefined } => {
  const result = minCountSchema(identifier, unitOptions).safeParse(identifier.minCount);
  return { isValid: result.success, issues: result.error?.issues };
};

export const validateMaxCount = (
  identifier: Identifier,
  unitOptions?: UnitOption[],
): { isValid: boolean; issues: ZodIssue[] | undefined } => {
  if (identifier.maxCount === undefined) {
    return { isValid: true, issues: undefined };
  }
  const result = maxCountSchema(unitOptions).safeParse(identifier.maxCount);
  return {
    isValid: result.success,
    issues: result.error?.issues,
  };
};

export const getValidationMessage = (
  validationIssues: ZodIssue[] | undefined,
): string | undefined => validationIssues?.map((issue) => issue.message).join(', ');
