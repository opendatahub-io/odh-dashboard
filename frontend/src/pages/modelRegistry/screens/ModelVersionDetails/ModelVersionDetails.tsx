import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { Breadcrumb, BreadcrumbItem, Flex, FlexItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useModelVersionById from '~/concepts/modelRegistry/apiHooks/useModelVersionById';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { modelVersionUrl, registeredModelUrl } from '~/pages/modelRegistry/screens/routeUtils';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
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
  const [mv, mvLoaded, mvLoadError] = useModelVersionById(mvId);

  return (
    <ApplicationsPage
      {...pageProps}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to="/modelRegistry">
                Registered models - {preferredModelRegistry?.metadata.name}
              </Link>
            )}
          />
          <BreadcrumbItem
            render={() => (
              <Link to={registeredModelUrl(rmId, preferredModelRegistry?.metadata.name)}>
                {rm?.name}
              </Link>
            )}
          />
          <BreadcrumbItem isActive>{mv?.name}</BreadcrumbItem>
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
              <ModelVersionsDetailsHeaderActions />
            </FlexItem>
          </Flex>
        )
      }
      description={mv?.description}
      loadError={mvLoadError}
      loaded={mvLoaded}
      provideChildrenPadding
    >
      {mv !== null && <ModelVersionDetailsTabs tab={tab} modelVersion={mv} />}
    </ApplicationsPage>
  );
};

export default ModelVersionsDetails;
