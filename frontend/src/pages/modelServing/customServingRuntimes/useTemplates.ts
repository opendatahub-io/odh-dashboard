import * as React from 'react';
import { listTemplates } from '~/api';
import { TemplateKind } from '~/k8sTypes';
import { fetchTemplateOrder } from '~/services/templateOrderService';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { compareTemplateKinds } from './utils';

const useTemplates = (namespace?: string): FetchState<TemplateKind[]> => {
  // TODO
  const getOrderedTemplates = React.useCallback(
    () =>
      Promise.all([
        listTemplates(namespace, 'opendatahub.io/dashboard=true').catch((e) => {
          if (e.statusObject?.code === 404) {
            throw new Error('Serving Runtime templates is not properly configured.');
          }
          throw e;
        }),
        fetchTemplateOrder().catch((e) => {
          if (e.statusObject?.code === 404) {
            throw new Error('Dashboard config template order is not configured.');
          }
          throw e;
        }),
      ]).then(([templates, order]) => templates.sort(compareTemplateKinds(order))),
    [namespace],
  );

  return useFetchState<TemplateKind[]>(getOrderedTemplates, []);
};

export default useTemplates;
