import { Identifier } from '~/types';
import { isLarger, UnitOption } from '~/utilities/valueUnits';

export const validateDefaultCount = (identifier: Identifier, unitOptions?: UnitOption[]): boolean =>
  unitOptions
    ? isLarger(String(identifier.defaultCount), String(identifier.minCount), unitOptions, true) &&
      isLarger(String(identifier.maxCount), String(identifier.defaultCount), unitOptions, true)
    : identifier.defaultCount >= identifier.minCount &&
      identifier.maxCount >= identifier.defaultCount;

export const validateMinCount = (identifier: Identifier, unitOptions?: UnitOption[]): boolean =>
  unitOptions
    ? isLarger(String(identifier.maxCount), String(identifier.minCount), unitOptions, true)
    : identifier.maxCount >= identifier.minCount;
