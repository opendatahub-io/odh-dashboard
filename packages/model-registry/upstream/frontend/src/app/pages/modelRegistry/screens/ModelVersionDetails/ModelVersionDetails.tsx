import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  Flex,
  FlexItem,
  Truncate,
  Title,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { ApplicationsPage } from 'mod-arch-shared';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { KnownLabels } from '~/odh/k8sTypes';
import useRegisteredModelById from '~/app/hooks/useRegisteredModelById';
import useModelVersionById from '~/app/hooks/useModelVersionById';
import useModelArtifactsByVersionId from '~/app/hooks/useModelArtifactsByVersionId';
import { ModelState } from '~/app/types';
import {
  archiveModelVersionDetailsUrl,
  modelVersionArchiveDetailsUrl,
  modelVersionUrl,
  registeredModelUrl,
} from '~/app/pages/modelRegistry/screens/routeUtils';
import ModelVersionSelector from './ModelVersionSelector';
import ModelVersionDetailsTabs from './ModelVersionDetailsTabs';
import ModelVersionsDetailsHeaderActions from './ModelVersionDetailsHeaderActions';
import { MRDeployButton } from '~/odh/components/MRDeployButton';
import { KnownLabels } from '~/odh/k8sTypes';
import { MRDeploymentsContextProvider } from '~/odh/components/MRDeploymentsContextProvider';

type ModelVersionsDetailProps = {
  tab: string;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const ModelVersionsDetailsContent: React.FC<ModelVersionsDetailProps> = ({ tab, ...pageProps }) => {
  const navigate = useNavigate();

  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);

  const { modelVersionId: mvId, registeredModelId: rmId } = useParams();
  const [rm] = useRegisteredModelById(rmId);
  const [mv, mvLoaded, mvLoadError, refreshModelVersion] = useModelVersionById(mvId);
  const [modelArtifacts, modelArtifactsLoaded, modelArtifactsLoadError, refreshModelArtifacts] =
    useModelArtifactsByVersionId(mvId);

  const refresh = React.useCallback(() => {
    refreshModelVersion();
    refreshModelArtifacts();
  }, [refreshModelVersion, refreshModelArtifacts]);

  const loaded = mvLoaded && modelArtifactsLoaded;
  const loadError = mvLoadError || modelArtifactsLoadError;

  useEffect(() => {
    if (rm?.state === ModelState.ARCHIVED && mv?.id) {
      navigate(
        archiveModelVersionDetailsUrl(mv.id, mv.registeredModelId, preferredModelRegistry?.name),
      );
    } else if (mv?.state === ModelState.ARCHIVED) {
      navigate(
        modelVersionArchiveDetailsUrl(mv.id, mv.registeredModelId, preferredModelRegistry?.name),
      );
    }
  }, [rm?.state, mv?.id, mv?.state, mv?.registeredModelId, preferredModelRegistry?.name, navigate]);

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
          <BreadcrumbItem
            data-testid="breadcrumb-model-version"
            render={() => (
              <Link to={registeredModelUrl(rmId, preferredModelRegistry?.name)}>
                {rm?.name || 'Loading...'}
              </Link>
            )}
          />
          <BreadcrumbItem data-testid="breadcrumb-version-name" isActive>
            {mv?.name || 'Loading...'}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      title={
        <Flex alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Title headingLevel="h1" size="xl">
              {rm?.name || 'Loading...'}
            </Title>
          </FlexItem>
          <FlexItem>
            {mv && (
              <ModelVersionSelector
                rmId={rmId}
                selection={mv}
                onSelect={(modelVersionId) =>
                  navigate(modelVersionUrl(modelVersionId, rmId, preferredModelRegistry?.name))
                }
              />
            )}
          </FlexItem>
        </Flex>
      }
      headerAction={
        loaded &&
        mv && (
          <Flex
            spaceItems={{ default: 'spaceItemsMd' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
          >
            <MRDeployButton mv={mv} />
            <FlexItem>
              <ModelVersionsDetailsHeaderActions
                mv={mv}
                refresh={refresh}
                modelArtifacts={modelArtifacts}
              />
            </FlexItem>
          </Flex>
        )
      }
      description={<Truncate content={mv?.description || ''} />}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
    >
      {mv !== null && (
        <ModelVersionDetailsTabs
          tab={tab}
          modelVersion={mv}
          refresh={refresh}
          modelArtifacts={modelArtifacts}
        />
      )}
    </ApplicationsPage>
  );
};

const ModelVersionsDetails: React.FC<ModelVersionsDetailProps> = (props) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const { modelVersionId: mvId } = useParams();
  
  const labelSelectors = React.useMemo(() => {
    return mvId ? { [KnownLabels.MODEL_VERSION_ID]: mvId } : undefined;
  }, [mvId]);
  
  return (
    <MRDeploymentsContextProvider labelSelectors={labelSelectors} mrName={preferredModelRegistry?.name}>
      <ModelVersionsDetailsContent {...props} />
    </MRDeploymentsContextProvider>
  );
};

export default ModelVersionsDetails;
