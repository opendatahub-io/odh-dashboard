import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isDetailTabExtension } from '@odh-dashboard/plugin-core/extension-points';
import { ExtensibleDetailTabs } from '@odh-dashboard/plugin-core/helpers/ui';
import { useQueryParamNamespaces } from 'mod-arch-core';
import { CatalogArtifactList, CatalogModel } from '~/app/modelCatalogTypes';
import {
  isModelValidated,
  hasPerformanceArtifacts,
} from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
import { ModelDetailsTab } from '~/concepts/modelCatalog/const';
import ModelDetailsView from './ModelDetailsView';
import PerformanceInsightsView from './PerformanceInsightsView';

export const MODEL_CATALOG_DETAILS_GROUP = 'model-catalog.details';

export enum ModelDetailsTabTitle {
  OVERVIEW = 'Overview',
  PERFORMANCE_INSIGHTS = 'Performance insights',
}

type ModelDetailsTabsProps = {
  model: CatalogModel;
  tab: string;
  sourceId: string;
  artifacts: CatalogArtifactList;
  artifactLoaded: boolean;
  artifactsLoadError: Error | undefined;
};

const ModelDetailsTabs = ({
  model,
  tab,
  sourceId,
  artifacts,
  artifactLoaded,
  artifactsLoadError,
}: ModelDetailsTabsProps): React.JSX.Element => {
  const navigate = useNavigate();
  const tabExtensions = useExtensions(isDetailTabExtension);
  const queryParams = useQueryParamNamespaces();
  const catalogNamespace =
    typeof queryParams.namespace === 'string' ? queryParams.namespace : undefined;

  // Keep the tab available while artifacts are loading so async extension tabs do not redirect.
  const showValidatedInsights =
    isModelValidated(model) && (!artifactLoaded || hasPerformanceArtifacts(artifacts.items));

  const componentProps = React.useMemo(
    () => ({
      modelName: model.name,
      sourceId,
      namespace: catalogNamespace,
    }),
    [model.name, sourceId, catalogNamespace],
  );

  const staticTabs = React.useMemo(() => {
    const tabs = [
      {
        id: ModelDetailsTab.OVERVIEW,
        title: ModelDetailsTabTitle.OVERVIEW,
        content: (
          <ModelDetailsView
            model={model}
            artifacts={artifacts}
            artifactLoaded={artifactLoaded}
            artifactsLoadError={artifactsLoadError}
          />
        ),
      },
    ];

    if (showValidatedInsights) {
      tabs.push({
        id: ModelDetailsTab.PERFORMANCE_INSIGHTS,
        title: ModelDetailsTabTitle.PERFORMANCE_INSIGHTS,
        content: <PerformanceInsightsView model={model} />,
      });
    }

    return tabs;
  }, [model, artifacts, artifactLoaded, artifactsLoadError, showValidatedInsights]);

  return (
    <ExtensibleDetailTabs
      activeKey={tab}
      onSelect={(tabKey, options) =>
        navigate(`../${tabKey}`, { relative: 'path', replace: options?.replace })
      }
      staticTabs={staticTabs}
      extensionTabs={tabExtensions}
      group={MODEL_CATALOG_DETAILS_GROUP}
      componentProps={componentProps}
      mountOnEnter
      ariaLabel="Model details page tabs"
      testId="model-details-page-tabs"
    />
  );
};

export default ModelDetailsTabs;
