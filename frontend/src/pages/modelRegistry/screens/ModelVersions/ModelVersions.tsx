import React from 'react';
import { useParams } from 'react-router';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useModelVersionsByRegisteredModel from '~/concepts/modelRegistry/apiHooks/useModelVersionsByRegisteredModel';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { filterLiveVersions } from '~/concepts/modelRegistry/utils';
import ModelVersionsTabs from './ModelVersionsTabs';
import ModelVersionsHeaderActions from './ModelVersionsHeaderActions';
import { ModelVersionsTab } from './const';

type ModelVersionsProps = {
  tab: ModelVersionsTab;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const ModelVersions: React.FC<ModelVersionsProps> = ({ tab, ...pageProps }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const { registeredModelId: rmId } = useParams();
  const [modelVersions, mvLoaded, mvLoadError, mvRefresh] = useModelVersionsByRegisteredModel(rmId);
  const [rm, rmLoaded, rmLoadError, rmRefresh] = useRegisteredModelById(rmId);
  const loadError = mvLoadError || rmLoadError;
  const loaded = mvLoaded && rmLoaded;

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
          <BreadcrumbItem data-testid="breadcrumb-model" isActive>
            {rm?.name || 'Loading...'}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      title={rm?.name}
      headerAction={rm && <ModelVersionsHeaderActions rm={rm} />}
      description={rm?.description}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
    >
      {rm !== null && (
        <ModelVersionsTabs
          tab={tab}
          registeredModel={rm}
          refresh={rmRefresh}
          mvRefresh={mvRefresh}
          modelVersions={filterLiveVersions(modelVersions.items)}
        />
      )}
    </ApplicationsPage>
  );
};

export default ModelVersions;
