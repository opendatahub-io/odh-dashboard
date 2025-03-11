import { z } from 'zod';
import { Identifier } from '~/types';
import { isLarger, UnitOption } from '~/utilities/valueUnits';

const defaultCountSchema = (identifier: Identifier, unitOptions?: UnitOption[]) =>
  z.union([z.string(), z.number()]).refine(
    (defaultCount) => {
      if (unitOptions) {
        const isDefaultAboveMin = isLarger(
          String(defaultCount),
          String(identifier.minCount),
          unitOptions,
          true,
        );
        const isDefaultBelowMax =
          identifier.maxCount === undefined ||
          isLarger(String(identifier.maxCount), String(defaultCount), unitOptions, true);
        return isDefaultAboveMin && isDefaultBelowMax;
      }

      const defaultVal = Number(defaultCount);
      const minCount = Number(identifier.minCount);
      const maxCount = identifier.maxCount !== undefined ? Number(identifier.maxCount) : undefined;

      return defaultVal >= minCount && (maxCount === undefined || defaultVal <= maxCount);
    },
    {
      message: 'Default must be equal to or between the minimum and maximum allowed limits.',
    },
  );

const minCountSchema = (identifier: Identifier, unitOptions?: UnitOption[]) =>
  z.union([z.string(), z.number()]).refine(
    (minCount) => {
      if (unitOptions) {
        return (
          identifier.maxCount === undefined ||
          isLarger(String(identifier.maxCount), String(minCount), unitOptions, true)
        );
      }

      const minVal = Number(minCount);
      const maxCount = identifier.maxCount !== undefined ? Number(identifier.maxCount) : undefined;

      return maxCount === undefined || minVal <= maxCount;
    },
    {
      message: 'Minimum allowed value cannot exceed the maximum allowed value (if specified).',
    },
  );

export const validateDefaultCount = (
  identifier: Identifier,
  unitOptions?: UnitOption[],
): boolean => {
  const result = defaultCountSchema(identifier, unitOptions).safeParse(identifier.defaultCount);
  return result.success;
};

export const validateMinCount = (identifier: Identifier, unitOptions?: UnitOption[]): boolean => {
  const result = minCountSchema(identifier, unitOptions).safeParse(identifier.minCount);
  return result.success;
};
