import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { isDetailTabExtension } from '@odh-dashboard/plugin-core/extension-points';
import { ExtensibleDetailTabs } from '@odh-dashboard/plugin-core/helpers/ui';
import { useQueryParamNamespaces } from 'mod-arch-core';
import { CatalogArtifactList, CatalogModel } from '~/app/modelCatalogTypes';
import { shouldShowValidatedInsights } from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
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
  const namespace = typeof queryParams.namespace === 'string' ? queryParams.namespace : undefined;

  const showValidatedInsights = shouldShowValidatedInsights(model, artifacts.items);

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
      onSelect={(tabKey) => navigate(`../${tabKey}`, { relative: 'path' })}
      staticTabs={staticTabs}
      extensionTabs={tabExtensions}
      group={MODEL_CATALOG_DETAILS_GROUP}
      componentProps={{ modelName: model.name, sourceId, namespace }}
      ariaLabel="Model details page tabs"
      testId="model-details-page-tabs"
    />
  );
};

export default ModelDetailsTabs;
