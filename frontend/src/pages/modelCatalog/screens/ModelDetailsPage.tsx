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
        modelCatalogSources.data,
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
      empty={Boolean(modelCatalogSources.error) || model === null}
      emptyStatePage={
        <EmptyModelCatalogState
          testid="empty-model-catalog-state"
          title={modelCatalogSources.error ? 'Details not found' : 'Unable to load model details'}
          description={modelCatalogSources.error?.message || 'Refresh the page or try again later'}
          headerIcon={() => (
            <img src={typedEmptyImage(ProjectObjectType.registeredModels, 'Error')} alt="" />
          )}
        />
      }
      loaded={modelCatalogSources.loaded}
      loadError={modelCatalogSources.error}
      errorMessage="Unable to load model catalog"
      provideChildrenPadding
      headerAction={<Button data-testid="register-model-button">Register model</Button>}
    >
      <Divider />
      {model !== null && <ModelDetailsView model={model} />}
    </ApplicationsPage>
  );
});

export default ModelDetailsPage;
