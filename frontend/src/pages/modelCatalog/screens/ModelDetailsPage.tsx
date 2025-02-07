import React from 'react';
import { useParams } from 'react-router';
import { Button, Divider } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import { ModelCatalogContext } from '~/concepts/modelCatalog/context/ModelCatalogContext';
import { CatalogModel } from '~/concepts/modelCatalog/types';
import EmptyModelCatalogState from '~/pages/modelCatalog/EmptyModelCatalogState';
import { decodeParams, findModelFromModelCatalogSources } from '~/pages/modelCatalog/utils';
import { ModelDetailsRouteParams } from '~/pages/modelCatalog/const';
import ModelDetailsView from './ModelDetailsView';

const ModelDetailsPage: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const params = useParams<ModelDetailsRouteParams>();

  const { modelCatalogSources } = React.useContext(ModelCatalogContext);

  const decodedParams = decodeParams(params);

  const model: CatalogModel | null = React.useMemo(
    () =>
      findModelFromModelCatalogSources(
        modelCatalogSources,
        decodedParams.sourceName,
        decodedParams.repositoryName,
        decodedParams.modelName,
        decodedParams.tag,
      ),
    [modelCatalogSources, decodedParams],
  );

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon
          title={decodedParams.modelName || ''}
          objectType={ProjectObjectType.registeredModels}
        />
      }
      empty={model === null}
      emptyStatePage={
        <EmptyModelCatalogState
          testid="empty-model-catalog-state"
          title="Details not found"
          description="To request access to model catalog, contact your administrator."
          headerIcon={() => (
            <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />
          )}
        />
      }
      loaded
      provideChildrenPadding
      headerAction={<Button data-testid="register-model-button">Register model</Button>}
    >
      <Divider />
      {model !== null && <ModelDetailsView model={model} />}
    </ApplicationsPage>
  );
});

export default ModelDetailsPage;
