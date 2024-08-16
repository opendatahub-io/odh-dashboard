import React from 'react';
import { useParams } from 'react-router';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { registeredModelUrl } from '~/pages/modelRegistry/screens/routeUtils';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import useModelVersionsByRegisteredModel from '~/concepts/modelRegistry/apiHooks/useModelVersionsByRegisteredModel';
import { filterArchiveVersions } from '~/concepts/modelRegistry/utils';
import ModelVersionsArchiveListView from './ModelVersionsArchiveListView';

type ModelVersionsArchiveProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const ModelVersionsArchive: React.FC<ModelVersionsArchiveProps> = ({ ...pageProps }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);

  const { registeredModelId: rmId } = useParams();
  const [rm] = useRegisteredModelById(rmId);
  const [modelVersions, mvLoaded, mvLoadError, refresh] = useModelVersionsByRegisteredModel(rmId);

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
          <BreadcrumbItem
            render={() => (
              <Link to={registeredModelUrl(rmId, preferredModelRegistry?.metadata.name)}>
                {rm?.name || 'Loading...'}
              </Link>
            )}
          />
          <BreadcrumbItem data-testid="archive-version-page-breadcrumb" isActive>
            Archived versions
          </BreadcrumbItem>
        </Breadcrumb>
      }
      title={rm ? `Archived versions of ${rm.name}` : 'Archived versions'}
      loadError={mvLoadError}
      loaded={mvLoaded}
      provideChildrenPadding
    >
      <ModelVersionsArchiveListView
        modelVersions={filterArchiveVersions(modelVersions.items)}
        refresh={refresh}
      />
    </ApplicationsPage>
  );
};

export default ModelVersionsArchive;
