import { isEqual } from 'lodash-es';

export const isStateEqual = <T>(stateBefore: T, stateAfter: T): boolean =>
  isEqual(stateBefore, stateAfter);
