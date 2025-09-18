import * as React from 'react';
import EmptyStateErrorMessage from '@odh-dashboard/internal/components/EmptyStateErrorMessage';
import FeatureStoreProjectSelectorNavigator from './FeatureStoreProjectSelectorNavigator';
import { FeatureStoreObject } from '../../const';

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
    title={title || 'Feature store repository not found'}
    bodyText={`${projectName ? `Repository ${projectName}` : 'The Repository'} was not found.`}
  >
    <FeatureStoreProjectSelectorNavigator getRedirectPath={getRedirectPath} />
  </EmptyStateErrorMessage>
);

export default InvalidFeatureStoreProject;
