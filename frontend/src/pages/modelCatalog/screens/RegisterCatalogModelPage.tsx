import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import React from 'react';
import { Link, useParams } from 'react-router';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { getCatalogModelDetailsRoute } from '#~/routes/modelCatalog/catalogModelDetails';
import { ModelCatalogContext } from '#~/concepts/modelCatalog/context/ModelCatalogContext';
import { CatalogModel } from '#~/concepts/modelCatalog/types';
import useModelRegistryAPIState from '#~/concepts/modelRegistry/context/useModelRegistryAPIState';
import { decodeParams, findModelFromModelCatalogSources } from '#~/pages/modelCatalog/utils';
import { CatalogModelDetailsParams } from '#~/pages/modelCatalog/types';
import useRegisteredModels from '#~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import RegisterCatalogModelForm from '#~/pages/modelCatalog/screens/RegisterCatalogModelForm';

const RegisterCatalogModelPage: React.FC = () => {
  const params = useParams<CatalogModelDetailsParams>();
  const decodedParams = React.useMemo(() => decodeParams(params), [params]);

  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const { modelCatalogSources } = React.useContext(ModelCatalogContext);

  const [registeredModels, registeredModelsLoaded, registeredModelsLoadError] =
    useRegisteredModels();

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

  const hostPath = `/api/service/modelregistry/${preferredModelRegistry?.metadata.name || ''}`;
  const [apiState] = useModelRegistryAPIState(hostPath);

  // Check to see if data is loaded
  const isDataReady =
    modelCatalogSources.loaded &&
    registeredModelsLoaded &&
    !registeredModelsLoadError &&
    model !== null;

  return (
    <ApplicationsPage
      title={`Register ${decodedParams.modelName || ''} model`}
      description="Create a new model and register the first version of your new model."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/ai-hub/catalog">Model catalog</Link>} />
          <BreadcrumbItem
            data-testid="breadcrumb-model-name"
            render={() =>
              !decodedParams.modelName ? (
                'Loading...'
              ) : (
                <Link to={getCatalogModelDetailsRoute(decodedParams)}>
                  {decodedParams.modelName}
                </Link>
              )
            }
          />
          <BreadcrumbItem data-testid="breadcrumb-version-name" isActive>
            Register model
          </BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={modelCatalogSources.loaded}
      loadError={modelCatalogSources.error}
      empty={false}
    >
      {isDataReady ? (
        <RegisterCatalogModelForm
          model={model}
          decodedParams={decodedParams}
          preferredModelRegistry={preferredModelRegistry}
          registeredModels={registeredModels}
          apiState={apiState}
        />
      ) : (
        <div>Loading...</div>
      )}
    </ApplicationsPage>
  );
};

export default RegisterCatalogModelPage;
