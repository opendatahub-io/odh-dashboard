import * as React from 'react';
import { listTemplates } from '~/api';
import { useAppContext } from '~/app/AppContext';
import { TemplateKind } from '~/k8sTypes';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';

const useTemplates = (namespace?: string): FetchState<TemplateKind[]> => {
  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();

  const getTemplates = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace provided'));
    }

    if (!customServingRuntimesEnabled) {
      return Promise.reject(new NotReadyError('Custom serving runtime is not enabled'));
    }

    return listTemplates(namespace, 'opendatahub.io/dashboard=true').catch((e) => {
      if (e.statusObject?.code === 404) {
        throw new Error('Serving Runtime templates is not properly configured.');
      }
      throw e;
    });
  }, [namespace, customServingRuntimesEnabled]);

  return useFetchState<TemplateKind[]>(getTemplates, []);
};

export default useTemplates;
