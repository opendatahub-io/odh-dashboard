import React from 'react';
import { useParams } from 'react-router';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useModelVersionsByRegisteredModel from '~/concepts/modelRegistry/apiHooks/useModelVersionsByRegisteredModel';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import GlobalModelVersionsTabs from './GlobalModelVersionsTabs';
import { ModelVersionsTabs } from './const';
import ModelVersionsHeaderActions from './ModelVersionsHeaderActions';

type ModelVersionsProps = {
  tab: ModelVersionsTabs;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const ModelVersions: React.FC<ModelVersionsProps> = ({ tab, ...pageProps }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const { registeredModelId: rmId } = useParams();
  const [modelVersions, mvLoaded, mvLoadError] = useModelVersionsByRegisteredModel(rmId);
  const [rm, rmLoaded, rmLoadError] = useRegisteredModelById(rmId);
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
                Registered models - {preferredModelRegistry?.metadata.name}
              </Link>
            )}
          />
          <BreadcrumbItem isActive>{rm?.name}</BreadcrumbItem>
        </Breadcrumb>
      }
      title={rm?.name}
      headerAction={<ModelVersionsHeaderActions />}
      description={rm?.description}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
    >
      {rm !== null && (
        <GlobalModelVersionsTabs
          tab={tab}
          registeredModel={rm}
          modelVersions={modelVersions.items}
        />
      )}
    </ApplicationsPage>
  );
};

export default ModelVersions;
