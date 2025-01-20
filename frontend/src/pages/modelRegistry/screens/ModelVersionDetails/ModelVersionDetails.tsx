import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Breadcrumb, BreadcrumbItem, Flex, FlexItem, Truncate } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useModelVersionById from '~/concepts/modelRegistry/apiHooks/useModelVersionById';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import {
  archiveModelVersionDetailsUrl,
  modelVersionArchiveDetailsUrl,
  modelVersionUrl,
  registeredModelUrl,
} from '~/pages/modelRegistry/screens/routeUtils';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import useInferenceServices from '~/pages/modelServing/useInferenceServices';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { useMakeFetchObject } from '~/utilities/useMakeFetchObject';
import { ModelState } from '~/concepts/modelRegistry/types';
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
  const servingRuntimes = useMakeFetchObject(useServingRuntimes());

  const refresh = React.useCallback(() => {
    refreshModelVersion();
    inferenceServices.refresh();
    servingRuntimes.refresh();
  }, [inferenceServices, servingRuntimes, refreshModelVersion]);

  useEffect(() => {
    if (rm?.state === ModelState.ARCHIVED && mv?.id) {
      navigate(
        archiveModelVersionDetailsUrl(
          mv.id,
          mv.registeredModelId,
          preferredModelRegistry?.metadata.name,
        ),
      );
    } else if (mv?.state === ModelState.ARCHIVED) {
      navigate(
        modelVersionArchiveDetailsUrl(
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
            render={() => (
              <Link to={registeredModelUrl(rmId, preferredModelRegistry?.metadata.name)}>
                {rm?.name || 'Loading...'}
              </Link>
            )}
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
                    modelVersionUrl(modelVersionId, rmId, preferredModelRegistry?.metadata.name),
                  )
                }
              />
            </FlexItem>
            <FlexItem>
              <ModelVersionsDetailsHeaderActions
                mv={mv}
                hasDeployment={inferenceServices.data.length > 0}
                refresh={refresh}
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
        />
      )}
    </ApplicationsPage>
  );
};

export default ModelVersionsDetails;
