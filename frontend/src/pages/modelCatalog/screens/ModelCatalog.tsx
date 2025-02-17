import * as React from 'react';

import { PageSection } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import EmptyModelCatalogState from '~/pages/modelCatalog/EmptyModelCatalogState';
import { ModelCatalogContext } from '~/concepts/modelCatalog/context/ModelCatalogContext';
import { ModelCatalogCards } from '~/pages/modelCatalog/components/ModelCatalogCards';

const ModelCatalog: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const { modelCatalogSources } = React.useContext(ModelCatalogContext);
  const renderStateProps = {
    empty: modelCatalogSources.data.length === 0,
    emptyStatePage: (
      <EmptyModelCatalogState
        testid="empty-model-catalog-state"
        title="Request access to model catalog"
        description="To request access to model catalog, contact your administrator."
        headerIcon={() => <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />}
      />
    ),
    headerContent: null,
  };

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon title="Model Catalog" objectType={ProjectObjectType.registeredModels} />
      }
      {...renderStateProps}
      loaded={modelCatalogSources.loaded}
      provideChildrenPadding
    >
      <PageSection isFilled>
        <ModelCatalogCards sources={modelCatalogSources.data} />
      </PageSection>
    </ApplicationsPage>
  );
});

export default ModelCatalog;
