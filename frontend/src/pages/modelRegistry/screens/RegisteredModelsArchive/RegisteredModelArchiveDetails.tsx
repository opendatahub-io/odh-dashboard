import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Flex, FlexItem, Label, Text } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { registeredModelUrl } from '~/pages/modelRegistry/screens/routeUtils';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { ModelState } from '~/concepts/modelRegistry/types';
import { RestoreRegisteredModelModal } from '~/pages/modelRegistry/screens/components/RestoreRegisteredModel';
import ModelVersionsTabs from '~/pages/modelRegistry/screens/ModelVersions/ModelVersionsTabs';
import { ModelVersionsTab } from '~/pages/modelRegistry/screens/ModelVersions/const';
import useModelVersionsByRegisteredModel from '~/concepts/modelRegistry/apiHooks/useModelVersionsByRegisteredModel';
import RegisteredModelArchiveDetailsBreadcrumb from './RegisteredModelArchiveDetailsBreadcrumb';

type RegisteredModelsArchiveDetailsProps = {
  tab: ModelVersionsTab;
} & Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const RegisteredModelsArchiveDetails: React.FC<RegisteredModelsArchiveDetailsProps> = ({
  tab,
  ...pageProps
}) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const { apiState } = React.useContext(ModelRegistryContext);

  const navigate = useNavigate();

  const { registeredModelId: rmId } = useParams();
  const [rm, rmLoaded, rmLoadError, rmRefresh] = useRegisteredModelById(rmId);
  const [modelVersions, mvLoaded, mvLoadError, refresh] = useModelVersionsByRegisteredModel(rmId);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);

  return (
    <>
      <ApplicationsPage
        {...pageProps}
        breadcrumb={
          <RegisteredModelArchiveDetailsBreadcrumb
            preferredModelRegistry={preferredModelRegistry?.metadata.name}
            registeredModel={rm}
          />
        }
        title={
          rm && (
            <Flex>
              <FlexItem>
                <Text>{rm.name}</Text>
              </FlexItem>
              <FlexItem>
                <Label>Archived</Label>
              </FlexItem>
            </Flex>
          )
        }
        headerAction={
          <Button data-testid="restore-button" onClick={() => setIsRestoreModalOpen(true)}>
            Restore model
          </Button>
        }
        description={rm?.description}
        loadError={rmLoadError}
        loaded={rmLoaded}
        provideChildrenPadding
      >
        {rm !== null && mvLoaded && !mvLoadError && (
          <ModelVersionsTabs
            tab={tab}
            registeredModel={rm}
            modelVersions={modelVersions.items}
            refresh={rmRefresh}
            mvRefresh={refresh}
          />
        )}
      </ApplicationsPage>
      {rm !== null && (
        <RestoreRegisteredModelModal
          onCancel={() => setIsRestoreModalOpen(false)}
          onSubmit={() =>
            apiState.api
              .patchRegisteredModel(
                {},
                {
                  state: ModelState.LIVE,
                },
                rm.id,
              )
              .then(() =>
                navigate(registeredModelUrl(rm.id, preferredModelRegistry?.metadata.name)),
              )
          }
          isOpen={isRestoreModalOpen}
          registeredModelName={rm.name}
        />
      )}
    </>
  );
};

export default RegisteredModelsArchiveDetails;
