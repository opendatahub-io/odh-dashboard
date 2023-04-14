import * as React from 'react';
import { getDashboardConfigTemplateOrder } from '~/api';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useTemplateOrder = (namespace?: string): FetchState<string[]> => {
  const getTemplateOrder = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new Error('No namespace provided'));
    }
    return getDashboardConfigTemplateOrder(namespace).catch((e) => {
      if (e.statusObject?.code === 404) {
        throw new Error('Dashboard config template order is not configured.');
      }
      throw e;
    });
  }, [namespace]);

  return useFetchState<string[]>(getTemplateOrder, []);
};

export default useTemplateOrder;
