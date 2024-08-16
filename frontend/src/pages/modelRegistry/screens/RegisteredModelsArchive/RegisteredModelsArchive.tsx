import React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { filterArchiveModels } from '~/concepts/modelRegistry/utils';
import useRegisteredModels from '~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import RegisteredModelsArchiveListView from './RegisteredModelsArchiveListView';

type RegisteredModelsArchiveProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const RegisteredModelsArchive: React.FC<RegisteredModelsArchiveProps> = ({ ...pageProps }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const [registeredModels, loaded, loadError, refresh] = useRegisteredModels();

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
      title={`Archived models of ${preferredModelRegistry?.metadata.name}`}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
    >
      <RegisteredModelsArchiveListView
        registeredModels={filterArchiveModels(registeredModels.items)}
        refresh={refresh}
      />
    </ApplicationsPage>
  );
};

export default RegisteredModelsArchive;
