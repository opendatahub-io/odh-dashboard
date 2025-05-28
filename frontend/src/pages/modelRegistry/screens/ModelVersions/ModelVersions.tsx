import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Breadcrumb, BreadcrumbItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useModelVersionsByRegisteredModel from '~/concepts/modelRegistry/apiHooks/useModelVersionsByRegisteredModel';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelState } from '~/concepts/modelRegistry/types';
import { registeredModelArchiveDetailsRoute } from '~/routes/modelRegistry/modelArchive';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import { ModelRegistriesContext } from '~/concepts/modelRegistry/context/ModelRegistriesContext';
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
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const { registeredModelId: rmId } = useParams();
  const [modelVersions, mvLoaded, mvLoadError, mvRefresh] = useModelVersionsByRegisteredModel(rmId);
  const [rm, rmLoaded, rmLoadError, rmRefresh] = useRegisteredModelById(rmId);
  const loadError = mvLoadError || rmLoadError;
  const loaded = mvLoaded && rmLoaded;
  const navigate = useNavigate();
  const inferenceServices = useInferenceServices(
    undefined,
    rmId,
    undefined,
    preferredModelRegistry?.metadata.name,
  );

  useEffect(() => {
    if (rm?.state === ModelState.ARCHIVED) {
      navigate(registeredModelArchiveDetailsRoute(rm.id, preferredModelRegistry?.metadata.name));
    }
  }, [rm?.state, rm?.id, preferredModelRegistry?.metadata.name, navigate]);

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
      headerAction={
        rm && (
          <ModelVersionsHeaderActions
            hasDeployments={!!inferenceServices.data.items.length}
            rm={rm}
          />
        )
      }
      description={<Truncate content={rm?.description || ''} />}
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
          modelVersions={modelVersions.items}
        />
      )}
    </ApplicationsPage>
  );
};

export default ModelVersions;
