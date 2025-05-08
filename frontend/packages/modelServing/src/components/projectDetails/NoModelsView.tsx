import React from 'react';
import { Button } from '@patternfly/react-core';
// eslint-disable-next-line import/no-extraneous-dependencies
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { ModelServingPlatform } from '../../ModelServingContext';
import { isModelServingPlatformCard, ModelServingPlatformCard } from '../../extension-points';

export const NoModelsView: React.FC<{ platform: ModelServingPlatform }> = ({ platform }) => {
  const cards = useExtensions<ModelServingPlatformCard>(isModelServingPlatformCard);
  const selectedPlatformCard = React.useMemo(
    () => cards.find((c) => c.properties.platform === platform.properties.id),
    [cards, platform],
  );

  return (
    <EmptyDetailsView
      allowCreate
      iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
      // imageAlt={isProjectModelMesh ? 'No model servers' : 'No deployed models'}
      title={selectedPlatformCard?.properties.title}
      description={selectedPlatformCard?.properties.description}
      createButton={<Button>{selectedPlatformCard?.properties.selectText}</Button>}
      // footerExtraChildren={
      //   deployingFromRegistry stuff
      // }
    />
  );
};
