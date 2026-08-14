import React from 'react';
import { getTemplate } from '@odh-dashboard/internal/api/index';
import { NIMAccountKind, TemplateKind } from '@odh-dashboard/k8s-core';
import useFetch, { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';

export const useFetchNIMTemplate = (
  account?: NIMAccountKind | null,
): FetchStateObject<TemplateKind | undefined> => {
  const callback = React.useCallback(async () => {
    if (!account) {
      return Promise.reject(new Error('NIM Account unavailable'));
    }

    const templateName = account.status?.runtimeTemplate?.name;
    if (!templateName) {
      return Promise.reject(new Error('status.runtimeTemplate unavailable on NIM Account'));
    }
    const { namespace } = account.metadata;

    return getTemplate(templateName, namespace);
  }, [account]);

  return useFetch(callback, undefined);
};
