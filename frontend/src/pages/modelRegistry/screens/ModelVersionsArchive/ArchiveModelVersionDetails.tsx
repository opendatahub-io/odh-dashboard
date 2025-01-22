import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Flex, FlexItem, Label, Tooltip, Truncate } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useModelVersionById from '~/concepts/modelRegistry/apiHooks/useModelVersionById';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelVersionDetailsTab } from '~/pages/modelRegistry/screens/ModelVersionDetails/const';
import ModelVersionDetailsTabs from '~/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionDetailsTabs';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { useMakeFetchObject } from '~/utilities/useMakeFetchObject';
import { ModelState } from '~/concepts/modelRegistry/types';
import { modelVersionUrl } from '~/pages/modelRegistry/screens/routeUtils';
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
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const { modelVersionId: mvId, registeredModelId: rmId } = useParams();
  const [rm] = useRegisteredModelById(rmId);
  const [mv, mvLoaded, mvLoadError, refreshModelVersion] = useModelVersionById(mvId);
  const inferenceServices = useMakeFetchObject(
    useInferenceServices(
      undefined,
      mv?.registeredModelId,
      mv?.id,
      preferredModelRegistry?.metadata.name,
    ),
  );
  const navigate = useNavigate();
  const servingRuntimes = useMakeFetchObject(useServingRuntimes());

  useEffect(() => {
    if (rm?.state === ModelState.LIVE && mv?.id) {
      navigate(modelVersionUrl(mv.id, mv.registeredModelId, preferredModelRegistry?.metadata.name));
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
          refresh={refreshModelVersion}
        />
      )}
    </ApplicationsPage>
  );
};

export default ArchiveModelVersionDetails;
