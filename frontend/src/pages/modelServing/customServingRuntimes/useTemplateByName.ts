import * as React from 'react';
import { TemplateKind } from '#~/k8sTypes';
import { useTemplates } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';
import { findTemplateByName } from './utils';

export const useTemplateByName = (
  templateName?: string,
): [TemplateKind | undefined, boolean, Error | undefined] => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [templates, loaded, error] = useTemplates(dashboardNamespace);

  const template = React.useMemo(() => {
    if (!templateName || !loaded || error) {
      return undefined;
    }
    return findTemplateByName(templates, templateName);
  }, [templates, templateName, loaded, error]);

  return [template, loaded, error];
};
