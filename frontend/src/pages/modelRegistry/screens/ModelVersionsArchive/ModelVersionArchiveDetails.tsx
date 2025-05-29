import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Flex, FlexItem, Label, Truncate } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useModelVersionById from '#~/concepts/modelRegistry/apiHooks/useModelVersionById';
import { archiveModelVersionDetailsRoute } from '#~/routes/modelRegistry/modelArchive';
import { modelVersionRoute } from '#~/routes/modelRegistry/modelVersions';
import useRegisteredModelById from '#~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelVersionDetailsTab } from '#~/pages/modelRegistry/screens/ModelVersionDetails/const';
import ModelVersionDetailsTabs from '#~/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionDetailsTabs';
import { RestoreModelVersionModal } from '#~/pages/modelRegistry/screens/components/RestoreModelVersionModal';
import { ModelState } from '#~/concepts/modelRegistry/types';
import useInferenceServices from '#~/pages/modelServing/useInferenceServices';
import useServingRuntimes from '#~/pages/modelServing/useServingRuntimes';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import { ModelRegistryPageContext } from '#~/concepts/modelRegistry/context/ModelRegistryPageContext';
import useModelArtifactsByVersionId from '#~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import ModelVersionArchiveDetailsBreadcrumb from './ModelVersionArchiveDetailsBreadcrumb';

type ModelVersionsArchiveDetailsProps = {
  tab: ModelVersionDetailsTab;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const ModelVersionsArchiveDetails: React.FC<ModelVersionsArchiveDetailsProps> = ({
  tab,
  ...pageProps
}) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const { apiState } = React.useContext(ModelRegistryPageContext);

  const navigate = useNavigate();

  const { modelVersionId: mvId, registeredModelId: rmId } = useParams();
  const [rm] = useRegisteredModelById(rmId);
  const [mv, mvLoaded, mvLoadError, refreshModelVersion] = useModelVersionById(mvId);
  const [modelArtifacts, modelArtifactsLoaded, modelArtifactsLoadError, refreshModelArtifacts] =
    useModelArtifactsByVersionId(mvId);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const inferenceServices = useInferenceServices(
    undefined,
    mv?.registeredModelId,
    mv?.id,
    preferredModelRegistry?.metadata.name,
  );
  const servingRuntimes = useServingRuntimes();

  const refresh = React.useCallback(() => {
    refreshModelVersion();
    refreshModelArtifacts();
  }, [refreshModelVersion, refreshModelArtifacts]);

  useEffect(() => {
    if (rm?.state === ModelState.ARCHIVED && mv?.id) {
      navigate(
        archiveModelVersionDetailsRoute(
          mv.id,
          mv.registeredModelId,
          preferredModelRegistry?.metadata.name,
        ),
      );
    } else if (mv?.state === ModelState.LIVE) {
      navigate(
        modelVersionRoute(mv.id, mv.registeredModelId, preferredModelRegistry?.metadata.name),
      );
    }
  }, [
    rm?.state,
    mv?.state,
    mv?.id,
    mv?.registeredModelId,
    preferredModelRegistry?.metadata.name,
    navigate,
  ]);

  return (
    <>
      <ApplicationsPage
        {...pageProps}
        breadcrumb={
          <ModelVersionArchiveDetailsBreadcrumb
            preferredModelRegistry={preferredModelRegistry?.metadata.name}
            registeredModel={rm}
            modelVersionName={mv?.name}
          />
        }
        title={
          mv && (
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>{mv.name}</FlexItem>
              <Label>Archived</Label>
            </Flex>
          )
        }
        headerAction={
          <Button data-testid="restore-button" onClick={() => setIsRestoreModalOpen(true)}>
            Restore model version
          </Button>
        }
        description={<Truncate content={mv?.description || ''} />}
        loadError={mvLoadError}
        loaded={mvLoaded}
        provideChildrenPadding
      >
        {mv !== null && (
          <ModelVersionDetailsTabs
            isArchiveVersion
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
      {mv !== null && isRestoreModalOpen ? (
        <RestoreModelVersionModal
          onCancel={() => setIsRestoreModalOpen(false)}
          onSubmit={() =>
            apiState.api
              .patchModelVersion(
                {},
                {
                  state: ModelState.LIVE,
                },
                mv.id,
              )
              .then(() =>
                navigate(modelVersionRoute(mv.id, rm?.id, preferredModelRegistry?.metadata.name)),
              )
          }
          modelVersionName={mv.name}
        />
      ) : null}
    </>
  );
};

export default ModelVersionsArchiveDetails;
