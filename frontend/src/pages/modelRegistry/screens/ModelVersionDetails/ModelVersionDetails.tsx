import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Breadcrumb, BreadcrumbItem, Flex, FlexItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useModelVersionById from '#~/concepts/modelRegistry/apiHooks/useModelVersionById';
import { archiveModelVersionDetailsRoute } from '#~/routes/modelRegistry/modelArchive';
import { modelVersionArchiveDetailsRoute } from '#~/routes/modelRegistry/modelVersionArchive';
import { modelVersionRoute } from '#~/routes/modelRegistry/modelVersions';
import { registeredModelRoute } from '#~/routes/modelRegistry/registeredModels';
import useRegisteredModelById from '#~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import useInferenceServices from '#~/pages/modelServing/useInferenceServices';
import useServingRuntimes from '#~/pages/modelServing/useServingRuntimes';
import { ModelState } from '#~/concepts/modelRegistry/types';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import useModelArtifactsByVersionId from '#~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import { POLL_INTERVAL } from '#~/utilities/const';
import { ModelVersionDetailsTab } from './const';
import ModelVersionsDetailsHeaderActions from './ModelVersionDetailsHeaderActions';
import ModelVersionDetailsTabs from './ModelVersionDetailsTabs';
import ModelVersionSelector from './ModelVersionSelector';

type ModelVersionsDetailProps = {
  tab: ModelVersionDetailsTab;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const ModelVersionsDetails: React.FC<ModelVersionsDetailProps> = ({ tab, ...pageProps }) => {
  const navigate = useNavigate();

  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);

  const { modelVersionId: mvId, registeredModelId: rmId } = useParams();
  const [rm] = useRegisteredModelById(rmId);
  const [mv, mvLoaded, mvLoadError, refreshModelVersion] = useModelVersionById(mvId);
  const inferenceServices = useInferenceServices(
    undefined,
    mv?.registeredModelId,
    mv?.id,
    preferredModelRegistry?.metadata.name,
    { refreshRate: POLL_INTERVAL },
  );
  const [modelArtifacts, modelArtifactsLoaded, modelArtifactsLoadError, refreshModelArtifacts] =
    useModelArtifactsByVersionId(mvId);

  const servingRuntimes = useServingRuntimes();

  const refresh = React.useCallback(() => {
    refreshModelVersion();
    refreshModelArtifacts();
    inferenceServices.refresh();
    servingRuntimes.refresh();
  }, [inferenceServices, servingRuntimes, refreshModelVersion, refreshModelArtifacts]);

  useEffect(() => {
    if (rm?.state === ModelState.ARCHIVED && mv?.id) {
      navigate(
        archiveModelVersionDetailsRoute(
          mv.id,
          mv.registeredModelId,
          preferredModelRegistry?.metadata.name,
        ),
      );
    } else if (mv?.state === ModelState.ARCHIVED) {
      navigate(
        modelVersionArchiveDetailsRoute(
          mv.id,
          mv.registeredModelId,
          preferredModelRegistry?.metadata.name,
        ),
      );
    }
  }, [
    rm?.state,
    mv?.id,
    mv?.state,
    mv?.registeredModelId,
    preferredModelRegistry?.metadata.name,
    navigate,
  ]);

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
            render={() =>
              !rm?.name ? (
                'Loading...'
              ) : (
                <Link to={registeredModelRoute(rmId, preferredModelRegistry?.metadata.name)}>
                  {rm.name}
                </Link>
              )
            }
          />
          <BreadcrumbItem data-testid="breadcrumb-version-name" isActive>
            {mv?.name || 'Loading...'}
          </BreadcrumbItem>
        </Breadcrumb>
      }
      title={mv?.name}
      headerAction={
        mvLoaded &&
        mv && (
          <Flex
            spaceItems={{ default: 'spaceItemsMd' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
          >
            <FlexItem style={{ width: '300px' }}>
              <ModelVersionSelector
                rmId={rmId}
                selection={mv}
                onSelect={(modelVersionId) =>
                  navigate(
                    modelVersionRoute(modelVersionId, rmId, preferredModelRegistry?.metadata.name),
                  )
                }
              />
            </FlexItem>
            <FlexItem>
              <ModelVersionsDetailsHeaderActions
                mv={mv}
                registeredModel={rm}
                hasDeployment={inferenceServices.data.items.length > 0}
                refresh={refresh}
                modelArtifacts={modelArtifacts}
                modelArtifactsLoaded={modelArtifactsLoaded}
                modelArtifactsLoadError={modelArtifactsLoadError}
              />
            </FlexItem>
          </Flex>
        )
      }
      description={<Truncate content={mv?.description || ''} />}
      loadError={mvLoadError}
      loaded={mvLoaded}
      provideChildrenPadding
    >
      {mv !== null && (
        <ModelVersionDetailsTabs
          tab={tab}
          modelVersion={mv}
          inferenceServices={inferenceServices}
          servingRuntimes={servingRuntimes}
          refresh={refresh}
          modelArtifacts={modelArtifacts}
          modelArtifactsLoaded={modelArtifactsLoaded}
          modelArtifactsLoadError={modelArtifactsLoadError}
        />
      )}
    </ApplicationsPage>
  );
};

export default ModelVersionsDetails;
