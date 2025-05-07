import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import EmptyModelServingPlatform from '@odh-dashboard/internal/pages/modelServing/screens/projects/EmptyModelServingPlatform';
import { Button } from '@patternfly/react-core';
// eslint-disable-next-line import/no-extraneous-dependencies
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { useExtensions } from '@odh-dashboard/plugin-core';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { SelectPlatformView } from './SelectPlatformView';
import { ModelServingContext } from '../../ModelServingContext';
import { isModelServingPlatformCard, ModelServingPlatformCard } from '../../extension-points';
import { ProjectModelsContext } from '../../ProjectModelsContext';

export const EmptyModelServingView: React.FC<{ project: ProjectKind }> = ({ project }) => {
  const { modelServingPlatforms: platforms } = React.useContext(ModelServingContext);
  const { servingPlatform: selectedPlatform, setModelServingPlatform } =
    React.useContext(ProjectModelsContext);

  const cards = useExtensions<ModelServingPlatformCard>(
    isModelServingPlatformCard(selectedPlatform?.properties.id),
  );

  if (platforms.length === 0) {
    return <EmptyModelServingPlatform />;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (selectedPlatform) {
    return (
      <EmptyDetailsView
        allowCreate
        iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
        // imageAlt={isProjectModelMesh ? 'No model servers' : 'No deployed models'}
        title={cards[0].properties.title}
        description={cards[0].properties.description}
        createButton={<Button>{cards[0].properties.selectText}</Button>}
        // footerExtraChildren={
        //   deployingFromRegistry stuff
        // }
      />
    );
  }

  return (
    <SelectPlatformView
      platforms={platforms}
      cards={cards}
      project={project}
      setModelServingPlatform={setModelServingPlatform}
    />
  );
};
