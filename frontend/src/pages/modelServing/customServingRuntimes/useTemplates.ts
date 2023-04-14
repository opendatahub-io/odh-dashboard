import * as React from 'react';
import { listTemplates, getDashboardConfigTemplateOrder } from '~/api';
import { TemplateKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { compareTemplateKinds } from './utils';

const useTemplates = (namespace?: string): FetchState<TemplateKind[]> => {
  const getOrderedTemplates = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new Error('No namespace provided'));
    }
    return Promise.all([
      listTemplates(namespace, 'opendatahub.io/dashboard=true').catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('Serving Runtime templates is not properly configured.');
        }
        throw e;
      }),
      getDashboardConfigTemplateOrder(namespace).catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('Dashboard config template order is not configured.');
        }
        throw e;
      }),
    ]).then(([templates, order]) => templates.sort(compareTemplateKinds(order)));
  }, [namespace]);

  return useFetchState<TemplateKind[]>(getOrderedTemplates, []);
};

export default useTemplates;
