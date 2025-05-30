import * as React from 'react';

import { PageSection } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { conditionalArea, SupportedArea } from '#~/concepts/areas';
import EmptyModelCatalogState from '#~/pages/modelCatalog/EmptyModelCatalogState';
import { ModelCatalogContext } from '#~/concepts/modelCatalog/context/ModelCatalogContext';
import { ModelCatalogCards } from '#~/pages/modelCatalog/components/ModelCatalogCards';
import ScrollViewOnMount from '#~/components/ScrollViewOnMount';

const ModelCatalog: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const { modelCatalogSources } = React.useContext(ModelCatalogContext);

  return (
    <>
      <ScrollViewOnMount shouldScroll />
      <ApplicationsPage
        title={<TitleWithIcon title="Model catalog" objectType={ProjectObjectType.modelCatalog} />}
        description="Discover models that are available for your organization to register, deploy, and customize."
        empty={modelCatalogSources.data.length === 0}
        emptyStatePage={
          <EmptyModelCatalogState
            testid="empty-model-catalog-state"
            title="Request access to model catalog"
            description="To request access to model catalog, contact your administrator."
          />
        }
        headerContent={null}
        loaded={modelCatalogSources.loaded}
        loadError={modelCatalogSources.error}
        errorMessage="Unable to load model catalog"
        provideChildrenPadding
      >
        <PageSection isFilled>
          <ModelCatalogCards sources={modelCatalogSources.data} />
        </PageSection>
      </ApplicationsPage>
    </>
  );
});

export default ModelCatalog;
