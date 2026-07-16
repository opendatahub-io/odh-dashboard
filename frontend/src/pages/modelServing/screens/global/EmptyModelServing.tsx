import * as React from 'react';
import { EmptyDetailsView } from '@odh-dashboard/ui-core';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import ServeModelButton from '#~/pages/modelServing/screens/global/ServeModelButton';

const EmptyModelServing: React.FC = () => (
  <EmptyDetailsView
    title="No deployed models"
    description="To get started, deploy a model."
    iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
    imageAlt="deploy a model"
    createButton={<ServeModelButton />}
  />
);

export default EmptyModelServing;
