import * as React from 'react';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import ModelRegistrySelectorNavigator from './ModelRegistrySelectorNavigator';
import { modelRegistryUrl } from './routeUtils';

type InvalidModelRegistryProps = {
  title?: string;
  modelRegistry?: string;
};

const InvalidModelRegistry: React.FC<InvalidModelRegistryProps> = ({ title, modelRegistry }) => (
  <EmptyStateErrorMessage
    title={title || 'Model Registry not found'}
    bodyText={`${
      modelRegistry ? `Model Registry ${modelRegistry}` : 'The Model Registry'
    } was not found.`}
  >
    <ModelRegistrySelectorNavigator
      getRedirectPath={(modelRegistryName) => modelRegistryUrl(modelRegistryName)}
      primary
    />
  </EmptyStateErrorMessage>
);

export default InvalidModelRegistry;
