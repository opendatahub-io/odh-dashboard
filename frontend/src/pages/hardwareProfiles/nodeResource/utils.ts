import { Identifier } from '~/types';
import { isLarger, UnitOption } from '~/utilities/valueUnits';

export const validateDefaultCount = (identifier: Identifier, unitOption?: UnitOption[]): boolean =>
  unitOption
    ? isLarger(String(identifier.defaultCount), String(identifier.minCount), unitOption, true) &&
      isLarger(String(identifier.maxCount), String(identifier.defaultCount), unitOption, true)
    : identifier.defaultCount >= identifier.minCount &&
      identifier.maxCount >= identifier.defaultCount;

export const validateMinCount = (identifier: Identifier, unitOption?: UnitOption[]): boolean =>
  unitOption
    ? isLarger(String(identifier.maxCount), String(identifier.minCount), unitOption, true)
    : identifier.maxCount >= identifier.minCount;
