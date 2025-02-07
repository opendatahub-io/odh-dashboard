import * as React from 'react';
import { Outlet } from 'react-router';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import {
  ModelCatalogContext,
  ModelCatalogContextProvider,
} from '~/concepts/modelCatalog/context/ModelCatalogContext';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import EmptyModelCatalogState from './EmptyModelCatalogState';

const ModelCatalogCoreLoader: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const { modelCatalogSources } = React.useContext(ModelCatalogContext);

  if (modelCatalogSources.length === 0) {
    return (
      <ApplicationsPage
        title={
          <TitleWithIcon title="Model Catalog" objectType={ProjectObjectType.registeredModels} />
        }
        loaded
        empty
        provideChildrenPadding
      >
        <EmptyModelCatalogState
          testid="empty-model-catalog-state"
          title="Request access to model catalog"
          description="To request access to model catalog, contact your administrator."
          headerIcon={() => (
            <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />
          )}
        />
      </ApplicationsPage>
    );
  }
  return (
    <ModelCatalogContextProvider>
      <Outlet />
    </ModelCatalogContextProvider>
  );
});

export default ModelCatalogCoreLoader;
