import * as React from 'react';
import { useContext } from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import { ModelCatalogContext } from '~/concepts/modelCatalog/context/ModelCatalogContext';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import EmptyModelCatalogState from './EmptyModelCatalogState';

const ModelDetailsPage: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const modelCatalogContext = useContext(ModelCatalogContext);

  // eslint-disable-next-line no-console
  console.log('Model Catalog Context:', modelCatalogContext);

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon
          title="Model Catalog - Model Details"
          objectType={ProjectObjectType.registeredModels}
        />
      }
      empty
      emptyStatePage={
        <EmptyModelCatalogState
          testid="empty-model-catalog-details-state"
          title="Request access to model catalog"
          description="To request access to model catalog, contact your administrator."
          headerIcon={() => (
            <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />
          )}
        />
      }
      headerContent={null}
      loaded
      provideChildrenPadding
    />
  );
});

export default ModelDetailsPage;
