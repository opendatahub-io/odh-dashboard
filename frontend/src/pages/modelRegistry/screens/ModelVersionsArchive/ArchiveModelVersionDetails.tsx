import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Flex, FlexItem, Label, Tooltip, Truncate } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useModelVersionById from '~/concepts/modelRegistry/apiHooks/useModelVersionById';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelVersionDetailsTab } from '~/pages/modelRegistry/screens/ModelVersionDetails/const';
import ModelVersionDetailsTabs from '~/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionDetailsTabs';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { ModelState } from '~/concepts/modelRegistry/types';
import { modelVersionRoute } from '~/routes/modelRegistry/modelVersions';
import { ModelRegistriesContext } from '~/concepts/modelRegistry/context/ModelRegistriesContext';
import useModelArtifactsByVersionId from '~/concepts/modelRegistry/apiHooks/useModelArtifactsByVersionId';
import ArchiveModelVersionDetailsBreadcrumb from './ArchiveModelVersionDetailsBreadcrumb';

type ArchiveModelVersionDetailsProps = {
  tab: ModelVersionDetailsTab;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const ArchiveModelVersionDetails: React.FC<ArchiveModelVersionDetailsProps> = ({
  tab,
  ...pageProps
}) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const { modelVersionId: mvId, registeredModelId: rmId } = useParams();
  const [rm] = useRegisteredModelById(rmId);
  const [mv, mvLoaded, mvLoadError, refreshModelVersion] = useModelVersionById(mvId);
  const inferenceServices = useInferenceServices(
    undefined,
    mv?.registeredModelId,
    mv?.id,
    preferredModelRegistry?.metadata.name,
  );
  const [modelArtifacts, modelArtifactsLoaded, modelArtifactsLoadError, refreshModelArtifacts] =
    useModelArtifactsByVersionId(mvId);

  const navigate = useNavigate();
  const servingRuntimes = useServingRuntimes();

  const refresh = React.useCallback(() => {
    refreshModelVersion();
    refreshModelArtifacts();
  }, [refreshModelVersion, refreshModelArtifacts]);

  useEffect(() => {
    if (rm?.state === ModelState.LIVE && mv?.id) {
      navigate(
        modelVersionRoute(mv.id, mv.registeredModelId, preferredModelRegistry?.metadata.name),
      );
    }
  }, [rm?.state, mv?.id, mv?.registeredModelId, preferredModelRegistry?.metadata.name, navigate]);

  return (
    <ApplicationsPage
      {...pageProps}
      breadcrumb={
        <ArchiveModelVersionDetailsBreadcrumb
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
        <Tooltip content="The version of an archived model cannot be restored unless the model is restored.">
          <Button data-testid="restore-button" aria-label="restore model version" isAriaDisabled>
            Restore model version
          </Button>
        </Tooltip>
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
  );
};

export default ArchiveModelVersionDetails;
