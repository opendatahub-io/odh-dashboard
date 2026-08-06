import * as React from 'react';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { HostApiContext } from '../HostApiContext';
import type { K8sWatchResult } from '../types';

export const useTemplates = (namespace?: string): K8sWatchResult<TemplateKind[]> => {
  const api = React.useContext(HostApiContext);
  return api.useTemplates(namespace);
};
