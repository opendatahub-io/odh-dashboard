import React from 'react';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { useTemplates } from '@odh-dashboard/internal/api/index';
import useTemplateOrder from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/useTemplateOrder';
import useTemplateDisablement from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/useTemplateDisablement';
import type { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import type { TemplateKind } from '@odh-dashboard/internal/k8sTypes';
import {
  getSortedTemplates,
  getTemplateEnabled,
} from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';

/**
 * Custom hook that retrieves, sorts, and filters serving runtime templates for model serving.
 *
 * @description This hook orchestrates the fetching and processing of serving runtime templates
 * by combining template data with ordering and enablement configurations. The logic determines
 * which templates are available and in what order they should be displayed.
 *
 * **Logic Flow:**
 * 1. Fetches Template resources from the dashboard namespace
 * 2. Retrieves template ordering configuration from OdhDashboardConfig
 * 3. Retrieves template disablement configuration from OdhDashboardConfig
 * 4. Sorts templates according to the configured order
 * 5. Filters out disabled templates
 * 6. Returns the final list of enabled templates in the correct order
 *
 * **Kubernetes Resources:**
 * - `Template` (template.openshift.io/v1): Serving runtime templates labeled with
 *   `opendatahub.io/dashboard: true`. Contains ServingRuntime definitions and platform
 *   support annotations.
 * - `OdhDashboardConfig`: Dashboard configuration resource containing:
 *   - `spec.templateOrder`: Array of template names defining display order
 *   - `spec.templateDisablement`: Array of template names that should be disabled/hidden
 *
 * **Feature Dependencies:**
 * - Requires model serving to be enabled
 * - Custom serving runtimes feature flag affects which templates are included
 *
 * @returns A tuple containing:
 *   - `result`: Array of enabled TemplateKind objects sorted by configured order
 *   - `loaded`: Boolean indicating if all data sources have finished loading
 *   - `error`: Any error that occurred during data fetching from templates, ordering, or disablement
 */
export const useServingRuntimeTemplates = (): CustomWatchK8sResult<TemplateKind[]> => {
  const { dashboardNamespace } = useDashboardNamespace();

  const [templates, loaded, error] = useTemplates(dashboardNamespace);
  const {
    data: order,
    loaded: orderLoaded,
    error: orderError,
  } = useTemplateOrder(dashboardNamespace);
  const {
    data: disablement,
    loaded: disablementLoaded,
    error: disablementError,
  } = useTemplateDisablement(dashboardNamespace);

  const result = React.useMemo(() => {
    const sortedTemplates = getSortedTemplates(templates, order);
    const filteredTemplates = sortedTemplates.filter((template) =>
      getTemplateEnabled(template, disablement),
    );

    return filteredTemplates;
  }, [templates, order, disablement]);

  return [
    result,
    loaded && orderLoaded && disablementLoaded,
    error || orderError || disablementError,
  ];
};

export default useServingRuntimeTemplates;
