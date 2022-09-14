import { QuickStart } from '../../../types';
import { getQuickStarts } from '../../../utils/resourceUtils';

export const listQuickStarts = (): Promise<QuickStart[]> => {
  return Promise.resolve(getQuickStarts());
};
