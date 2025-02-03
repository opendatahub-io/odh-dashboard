import * as React from 'react';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import EmptyModelCatalogState from './EmptyModelCatalogState';

const ModelCatalogCoreLoader: React.FC = conditionalArea(
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
      description="Choose the right model for your business."
      {...renderStateProps}
      loaded
      provideChildrenPadding
    />
  );
});

export default ModelCatalogCoreLoader;
