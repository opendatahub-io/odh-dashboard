import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { ApplicationsPage } from 'mod-arch-shared';
import { ModelVersionsTab } from '../../app/pages/modelRegistry/screens/ModelVersions/const';
import useModelVersionsByRegisteredModel from '../../app/hooks/useModelVersionsByRegisteredModel';
import useRegisteredModelById from '../../app/hooks/useRegisteredModelById';
import { ModelRegistrySelectorContext } from '../../app/context/ModelRegistrySelectorContext';
import ModelVersionsHeaderActions from '../../app/pages/modelRegistry/screens/ModelVersions/ModelVersionsHeaderActions';
import { ModelState } from '../../app/types';
import { registeredModelArchiveDetailsUrl } from '../../app/pages/modelRegistry/screens/routeUtils';
import ModelVersionsTabs from '../../app/pages/modelRegistry/screens/ModelVersions/ModelVersionsTabs';
import { KnownLabels } from '../k8sTypes';
import { MRDeploymentsContextProvider } from './MRDeploymentsContextProvider';

type ModelVersionsProps = {
  tab: ModelVersionsTab | string;
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
  


  // Find the latest model version (non-archived)
  const latestModelVersion = React.useMemo(() => {
    if (!modelVersions.items?.length) return undefined;
    const liveVersions = modelVersions.items.filter(mv => mv.state !== ModelState.ARCHIVED);
    return liveVersions
      .toSorted((a, b) => Number(b.createTimeSinceEpoch) - Number(a.createTimeSinceEpoch))[0];
  }, [modelVersions.items]);

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
      headerAction={rm && <ModelVersionsHeaderActions rm={rm} latestModelVersion={latestModelVersion} />}
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
  
  const labelSelectors = React.useMemo(() => {
    return rmId ? { [KnownLabels.REGISTERED_MODEL_ID]: rmId } : undefined;
  }, [rmId]);
  
  return (
    <MRDeploymentsContextProvider labelSelectors={labelSelectors} mrName={preferredModelRegistry?.name}>
      <ModelVersionsContent {...props} />
    </MRDeploymentsContextProvider>
  );
};

export default ModelVersions;
