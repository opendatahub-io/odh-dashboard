import * as React from 'react';
import { listTemplates } from '~/api';
import { TemplateKind } from '~/k8sTypes';
import useCustomServingRuntimesEnabled from '~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';
import useModelServingEnabled from '~/pages/modelServing/useModelServingEnabled';
import { listTemplatesBackend } from '~/services/templateService';

const useTemplates = (namespace?: string, adminPanel?: boolean): FetchState<TemplateKind[]> => {
  const customServingRuntimesEnabled = useCustomServingRuntimesEnabled();
  const modelServingEnabled = useModelServingEnabled();

  const getTemplates = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace provided'));
    }

    if (!modelServingEnabled) {
      return Promise.reject(new NotReadyError('Model serving is not enabled'));
    }

    // TODO: Remove this when we migrate admin panel to Passthrough API
    if (adminPanel) {
      return listTemplatesBackend(namespace, 'opendatahub.io/dashboard=true')
        .catch((e) => {
          if (e.statusObject?.code === 404) {
            throw new Error('Serving Runtime templates is not properly configured.');
          }
          throw e;
        })
        .then((templates) => {
          if (modelServingEnabled && !customServingRuntimesEnabled) {
            return templates.filter(
              (template) => template.metadata?.labels?.['opendatahub.io/ootb'] === 'true',
            );
          }
          return templates;
        });
    }

    return listTemplates(namespace, 'opendatahub.io/dashboard=true')
      .catch((e) => {
        if (e.statusObject?.code === 404) {
          throw new Error('Serving Runtime templates is not properly configured.');
        }
        throw e;
      })
      .then((templates) => {
        if (modelServingEnabled && !customServingRuntimesEnabled) {
          return templates.filter(
            (template) => template.metadata?.labels?.['opendatahub.io/ootb'] === 'true',
          );
        }
        return templates;
      });
  }, [namespace, customServingRuntimesEnabled, modelServingEnabled, adminPanel]);

  return useFetchState<TemplateKind[]>(getTemplates, []);
};

export default useTemplates;
