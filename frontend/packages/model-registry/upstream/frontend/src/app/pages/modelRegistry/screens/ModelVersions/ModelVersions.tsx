import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { ApplicationsPage } from 'mod-arch-shared';
import { ModelVersionsTab } from '~/app/pages/modelRegistry/screens/ModelVersions/const';
import useModelVersionsByRegisteredModel from '~/app/hooks/useModelVersionsByRegisteredModel';
import useRegisteredModelById from '~/app/hooks/useRegisteredModelById';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import ModelVersionsHeaderActions from '~/app/pages/modelRegistry/screens/ModelVersions/ModelVersionsHeaderActions';
import { ModelState } from '~/app/types';
import { registeredModelArchiveDetailsUrl } from '~/app/pages/modelRegistry/screens/routeUtils';
import ModelVersionsTabs from './ModelVersionsTabs';
import { useDeploymentsState } from '~/odh/hooks/useDeploymentsState';
import { KnownLabels } from '~/odh/k8sTypes';
import { MRDeploymentsContextProvider } from '~/odh/components/MRDeploymentsContextProvider';

type ModelVersionsProps = {
  tab: ModelVersionsTab;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const ModelVersionsContent: React.FC<ModelVersionsProps> = ({ tab, ...pageProps }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const { registeredModelId: rmId } = useParams();
  const [modelVersions, mvLoaded, mvLoadError, mvRefresh] = useModelVersionsByRegisteredModel(rmId);
  const [rm, rmLoaded, rmLoadError, rmRefresh] = useRegisteredModelById(rmId);
  const loadError = mvLoadError || rmLoadError;
  const loaded = mvLoaded && rmLoaded;
  const navigate = useNavigate();
  
  const { deployments, loaded: deploymentsLoaded } = useDeploymentsState();
  
  const hasDeployments = React.useMemo(() => {
    if (!rmId || !deploymentsLoaded) return false;
    
    // Get all model version IDs for this registered model
    const mvIds = modelVersions.items.map(mv => mv.id);
    
    // Check if any model version of this registered model is deployed
    return !!deployments?.some(
      (s) => s.model.kind === 'InferenceService' && 
             mvIds.includes(s.model.metadata.labels?.[KnownLabels.MODEL_VERSION_ID] || ''),
    );
  }, [deployments, deploymentsLoaded, rmId, modelVersions.items]);

  useEffect(() => {
    if (rm?.state === ModelState.ARCHIVED) {
      navigate(registeredModelArchiveDetailsUrl(rm.id, preferredModelRegistry?.name));
    }
  }, [rm?.state, rm?.id, preferredModelRegistry?.name, navigate]);

  return (
    <ApplicationsPage
      {...pageProps}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to="/model-registry">Model registry - {preferredModelRegistry?.name}</Link>
            )}
          />
          <BreadcrumbItem data-testid="breadcrumb-model" isActive>
            {rm?.name || 'Loading...'}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      title={rm?.name}
      headerAction={rm && <ModelVersionsHeaderActions hasDeployments={hasDeployments} rm={rm} />}
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

const ModelVersions: React.FC<ModelVersionsProps> = (props) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const { registeredModelId: rmId } = useParams();
  const [modelVersions] = useModelVersionsByRegisteredModel(rmId);
  
  const labelSelectors = React.useMemo(() => {
    // Get all model version IDs for this registered model since deployments are labeled with MODEL_VERSION_ID
    const mvIds = modelVersions.items.map(mv => mv.id);
    if (mvIds.length === 0) return undefined;
    return {
      [KnownLabels.MODEL_VERSION_ID]: mvIds.join(','),
    };
  }, [modelVersions.items]);
  
  return (
    <MRDeploymentsContextProvider labelSelectors={labelSelectors} mrName={preferredModelRegistry?.name}>
      <ModelVersionsContent {...props} />
    </MRDeploymentsContextProvider>
  );
};

export default ModelVersions;
