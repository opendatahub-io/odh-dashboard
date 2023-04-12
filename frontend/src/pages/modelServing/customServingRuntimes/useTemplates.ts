import * as React from 'react';
import { listTemplates } from '~/api';
import { TemplateKind } from '~/k8sTypes';
import useFetchState, { FetchState } from '~/utilities/useFetchState';

const useTemplates = (namespace?: string): FetchState<TemplateKind[]> => {
  const getTemplates = React.useCallback(
    () =>
      listTemplates(namespace, 'opendatahub.io/dashboard=true').catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('Serving Runtime templates is not properly configured.');
        }
        throw e;
      }),
    [namespace],
  );

  return useFetchState<TemplateKind[]>(getTemplates, []);
};

export default useTemplates;
