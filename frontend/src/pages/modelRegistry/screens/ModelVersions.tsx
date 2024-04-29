import React from 'react';
import { useParams } from 'react-router';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useModelVersionsByRegisteredModel from '~/concepts/modelRegistry/apiHooks/useModelVersionsByRegisteredModel';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
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
  const { preferredModelRegistry } = React.useContext(ModelRegistryContext);
  const { registeredModelId: rmId } = useParams();
  const [modelVersions, mvLoaded, mvLoadError] = useModelVersionsByRegisteredModel(rmId);
  const [rm] = useRegisteredModelById(rmId);

  return (
    <ApplicationsPage
      {...pageProps}
      breadcrumb={
        // TODO: refactor this
        <Breadcrumb>
          <BreadcrumbItem to="/modelRegistry/modelregistry-sample">
            Registered models - {preferredModelRegistry?.metadata.name}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{rm?.name}</BreadcrumbItem>
        </Breadcrumb>
      }
      title={rm?.name}
      headerAction={<ModelVersionsHeaderActions />}
      description={rm?.description}
      loadError={mvLoadError}
      loaded={mvLoaded}
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
