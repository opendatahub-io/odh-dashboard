import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import EmptyModelServingPlatform from '@odh-dashboard/internal/pages/modelServing/screens/projects/EmptyModelServingPlatform';
import { Button } from '@patternfly/react-core';
// eslint-disable-next-line import/no-extraneous-dependencies
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { useExtensions } from '@odh-dashboard/plugin-core';
import {
  isModelServingPlatform,
  isModelServingPlatformCard,
  ModelServingPlatform,
  ModelServingPlatformCard,
} from '../../extension-points';

export const EmptyModelServingView: React.FC = () => {
  const platforms = useExtensions<ModelServingPlatform>(isModelServingPlatform);
  const selectedPlatform = 'kserve';

  const cards = useExtensions<ModelServingPlatformCard>(
    isModelServingPlatformCard(selectedPlatform),
  );

  if (platforms.length === 0) {
    return <EmptyModelServingPlatform />;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (cards.length === 1) {
    return (
      <EmptyDetailsView
        allowCreate
        iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
        // imageAlt={isProjectModelMesh ? 'No model servers' : 'No deployed models'}
        title={cards[0].properties.title}
        description={cards[0].properties.description}
        createButton={<Button>{cards[0].properties.selectText}</Button>}
        // footerExtraChildren={
        //   deployingFromRegistry &&
        //   !isProjectModelMesh && ( // For modelmesh we don't want to offer this until there is a model server
        //     <EmptyStateActions>
        //       <Button
        //         variant="link"
        //         onClick={() =>
        //           navigate(modelVersionRoute(modelVersionId, registeredModelId, modelRegistryName))
        //         }
        //         data-testid="deploy-from-registry"
        //       >
        //         Deploy model from model registry
        //       </Button>
        //     </EmptyStateActions>
        //   )
        // }
      />
    );
  }

  return <>select platform</>;
};
