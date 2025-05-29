import React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { filterArchiveModels } from '#~/concepts/modelRegistry/utils';
import useRegisteredModels from '#~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import useModelVersions from '#~/concepts/modelRegistry/apiHooks/useModelVersions';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import RegisteredModelsArchiveListView from './RegisteredModelsArchiveListView';

type RegisteredModelsArchiveProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const RegisteredModelsArchive: React.FC<RegisteredModelsArchiveProps> = ({ ...pageProps }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const [registeredModels, modelsLoaded, modelsLoadError, refreshModels] = useRegisteredModels();
  const [modelVersions, versionsLoaded, versionsLoadError, refreshVersions] = useModelVersions();

  const loaded = modelsLoaded && versionsLoaded;
  const loadError = modelsLoadError || versionsLoadError;

  const refresh = React.useCallback(() => {
    refreshModels();
    refreshVersions();
  }, [refreshModels, refreshVersions]);

  return (
    <ApplicationsPage
      {...pageProps}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to="/modelRegistry">
                Model registry - {preferredModelRegistry?.metadata.name}
              </Link>
            )}
          />
          <BreadcrumbItem data-testid="archive-model-page-breadcrumb" isActive>
            Archived models
          </BreadcrumbItem>
        </Breadcrumb>
      }
      title={`Archived models of ${preferredModelRegistry?.metadata.name ?? ''}`}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
    >
      <RegisteredModelsArchiveListView
        registeredModels={filterArchiveModels(registeredModels.items)}
        modelVersions={modelVersions.items}
        refresh={refresh}
      />
    </ApplicationsPage>
  );
};

export default RegisteredModelsArchive;
