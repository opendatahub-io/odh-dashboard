import * as React from 'react';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { findTemplateByName } from '@odh-dashboard/model-serving/shared';
import { useTemplates } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';

export const useTemplateByName = (
  templateName?: string,
  projectNamespace?: string,
): [TemplateKind | undefined, boolean, Error | undefined] => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [globalTemplates, globalLoaded, globalError] = useTemplates(dashboardNamespace);

  const shouldCheckProject = !!projectNamespace && projectNamespace !== dashboardNamespace;
  const [projectTemplates, projectLoaded, projectError] = useTemplates(
    shouldCheckProject ? projectNamespace : undefined,
  );

  const loaded = globalLoaded && (!shouldCheckProject || projectLoaded);
  const error = globalError ?? (shouldCheckProject ? projectError : undefined);

  const template = React.useMemo(() => {
    if (!templateName || !loaded || error) {
      return undefined;
    }
    return (
      findTemplateByName(globalTemplates, templateName) ??
      (shouldCheckProject ? findTemplateByName(projectTemplates, templateName) : undefined)
    );
  }, [globalTemplates, projectTemplates, templateName, loaded, error, shouldCheckProject]);

  return [template, loaded, error];
};
