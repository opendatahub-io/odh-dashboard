import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FeatureStoreProjectContext } from '#~/concepts/featureStore/context/FeatureStoreProjectContext.tsx';
import FeatureStoreProjectSelector from './components/FeatureStoreProjectSelector';

type FeatureStoreProjectSelectorNavigatorProps = {
  getRedirectPath: (featureStoreProject: string) => string;
};

const FeatureStoreProjectSelectorNavigator: React.FC<FeatureStoreProjectSelectorNavigatorProps> = ({
  getRedirectPath,
}) => {
  const navigate = useNavigate();
  const { featureStoreProject: currentFeatureStoreProject } = useParams<{
    featureStoreProject: string;
  }>();
  const { featureStoreProjects, updateFeatureStoreProject } = React.useContext(
    FeatureStoreProjectContext,
  );

  return (
    <FeatureStoreProjectSelector
      onSelection={(featureStoreProject: string) => {
        const match = featureStoreProject
          ? featureStoreProjects.find((project) => project.spec.name === featureStoreProject)
          : undefined;
        updateFeatureStoreProject(match);
        navigate(getRedirectPath(featureStoreProject));
      }}
      featureStoreProject={currentFeatureStoreProject ?? ''}
    />
  );
};

export default FeatureStoreProjectSelectorNavigator;
