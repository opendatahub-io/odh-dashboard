import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Flex, FlexItem, Label, Content, Tooltip, Truncate } from '@patternfly/react-core';
import { ApplicationsPage } from 'mod-arch-shared';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import useRegisteredModelById from '~/app/hooks/useRegisteredModelById';
import useModelVersionById from '~/app/hooks/useModelVersionById';
import { ModelState } from '~/app/types';
import { modelVersionUrl } from '~/app/pages/modelRegistry/screens/routeUtils';
import ModelVersionDetailsTabs from '~/app/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionDetailsTabs';
import ArchiveModelVersionDetailsBreadcrumb from './ArchiveModelVersionDetailsBreadcrumb';
import { MRDeploymentsContextProvider } from '~/odh/components/MRDeploymentsContextProvider';
import { KnownLabels } from '~/odh/k8sTypes';

type ArchiveModelVersionDetailsProps = {
  tab: string;
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
  const navigate = useNavigate();

  useEffect(() => {
    if (rm?.state === ModelState.LIVE && mv?.id) {
      navigate(modelVersionUrl(mv.id, mv.registeredModelId, preferredModelRegistry?.name));
    }
  }, [rm?.state, mv?.id, mv?.registeredModelId, preferredModelRegistry?.name, navigate]);

  const labelSelectors = React.useMemo(() => {
    if (!rmId || !mvId) {
      return undefined;
    }
    return {
      [KnownLabels.REGISTERED_MODEL_ID]: rmId,
      [KnownLabels.MODEL_VERSION_ID]: mvId,
    };
  }, [rmId, mvId]);

  return (
    <MRDeploymentsContextProvider labelSelectors={labelSelectors}>
      <ApplicationsPage
        {...pageProps}
        breadcrumb={
          <ArchiveModelVersionDetailsBreadcrumb
            preferredModelRegistry={preferredModelRegistry?.name}
            registeredModel={rm}
            modelVersionName={mv?.name}
          />
        }
        title={
          mv && (
            <Flex>
              <FlexItem>
                <Content>{mv.name}</Content>
              </FlexItem>
              <FlexItem>
                <Label>Archived</Label>
              </FlexItem>
            </Flex>
          )
        }
        headerAction={
          <Tooltip content="The version of an archived model cannot be restored unless the model is restored.">
            <Button data-testid="restore-button" aria-label="restore version" isAriaDisabled>
              Restore version
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
            refresh={refreshModelVersion}
          />
        )}
      </ApplicationsPage>
    </MRDeploymentsContextProvider>
  );
};

export default ArchiveModelVersionDetails;
