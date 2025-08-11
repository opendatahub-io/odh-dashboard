import * as React from 'react';
import EmptyStateErrorMessage from '#~/components/EmptyStateErrorMessage';
import { FeatureStoreObject } from '#~/pages/featureStore/const';
import FeatureStoreProjectSelectorNavigator from './FeatureStoreProjectSelectorNavigator';

type InvalidFeatureStoreProjectProps = {
  title?: string;
  projectName?: string;
  getRedirectPath: (featureStoreObject: FeatureStoreObject, featureStoreProject?: string) => string;
};

const InvalidFeatureStoreProject: React.FC<InvalidFeatureStoreProjectProps> = ({
  projectName,
  title,
  getRedirectPath,
}) => (
  <EmptyStateErrorMessage
    title={title || 'Feature store project not found'}
    bodyText={`${projectName ? `Project ${projectName}` : 'The Project'} was not found.`}
  >
    <FeatureStoreProjectSelectorNavigator getRedirectPath={getRedirectPath} />
  </EmptyStateErrorMessage>
);

export default InvalidFeatureStoreProject;
