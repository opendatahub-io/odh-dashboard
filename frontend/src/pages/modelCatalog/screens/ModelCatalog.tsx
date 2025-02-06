import * as React from 'react';

import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import EmptyModelCatalogState from '~/pages/modelCatalog/EmptyModelCatalogState';

const ModelCatalog: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const renderStateProps = {
    empty: true,
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
      loaded
      provideChildrenPadding
    />
  );
});

export default ModelCatalog;
