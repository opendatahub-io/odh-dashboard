import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Flex, FlexItem, Label, Truncate } from '@patternfly/react-core';
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

  useEffect(() => {
    if (rm?.state === ModelState.LIVE) {
      navigate(registeredModelUrl(rm.id, preferredModelRegistry?.metadata.name));
    }
  }, [rm?.state, preferredModelRegistry?.metadata.name, rm?.id, navigate]);

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
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>{rm.name}</FlexItem>
              <Label>Archived</Label>
            </Flex>
          )
        }
        headerAction={
          <Button data-testid="restore-button" onClick={() => setIsRestoreModalOpen(true)}>
            Restore model
          </Button>
        }
        description={<Truncate content={rm?.description || ''} />}
        loadError={rmLoadError}
        loaded={rmLoaded}
        provideChildrenPadding
      >
        {rm !== null && mvLoaded && !mvLoadError && (
          <ModelVersionsTabs
            tab={tab}
            isArchiveModel
            registeredModel={rm}
            modelVersions={modelVersions.items}
            refresh={rmRefresh}
            mvRefresh={refresh}
          />
        )}
      </ApplicationsPage>

      {rm !== null && isRestoreModalOpen ? (
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
          registeredModelName={rm.name}
        />
      ) : null}
    </>
  );
};

export default RegisteredModelsArchiveDetails;
