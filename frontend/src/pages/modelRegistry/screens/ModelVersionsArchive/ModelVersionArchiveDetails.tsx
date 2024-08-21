import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Flex, FlexItem, Label, Text } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useModelVersionById from '~/concepts/modelRegistry/apiHooks/useModelVersionById';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { modelVersionUrl } from '~/pages/modelRegistry/screens/routeUtils';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelVersionDetailsTab } from '~/pages/modelRegistry/screens/ModelVersionDetails/const';
import ModelVersionDetailsTabs from '~/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionDetailsTabs';
import { RestoreModelVersionModal } from '~/pages/modelRegistry/screens/components/RestoreModelVersionModal';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { ModelState } from '~/concepts/modelRegistry/types';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { useMakeFetchObject } from '~/utilities/useMakeFetchObject';
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
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const { apiState } = React.useContext(ModelRegistryContext);

  const navigate = useNavigate();

  const { modelVersionId: mvId, registeredModelId: rmId } = useParams();
  const [rm] = useRegisteredModelById(rmId);
  const [mv, mvLoaded, mvLoadError, refreshModelVersion] = useModelVersionById(mvId);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const inferenceServices = useMakeFetchObject(
    useInferenceServices(undefined, mv?.registeredModelId, mv?.id),
  );
  const servingRuntimes = useMakeFetchObject(useServingRuntimes());

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
            <Flex>
              <FlexItem>
                <Text>{mv.name}</Text>
              </FlexItem>
              <FlexItem>
                <Label>Archived</Label>
              </FlexItem>
            </Flex>
          )
        }
        headerAction={
          <Button data-testid="restore-button" onClick={() => setIsRestoreModalOpen(true)}>
            Restore version
          </Button>
        }
        description={mv?.description}
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
            refresh={refreshModelVersion}
          />
        )}
      </ApplicationsPage>
      {mv !== null && (
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
                navigate(modelVersionUrl(mv.id, rm?.id, preferredModelRegistry?.metadata.name)),
              )
          }
          isOpen={isRestoreModalOpen}
          modelVersionName={mv.name}
        />
      )}
    </>
  );
};

export default ModelVersionsArchiveDetails;
