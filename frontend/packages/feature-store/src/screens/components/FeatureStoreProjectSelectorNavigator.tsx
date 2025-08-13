import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import FeatureStoreProjectSelector from './FeatureStoreProjectSelector';
import { useFeatureStoreObject } from '../../apiHooks/useFeatureStoreObject';
import { FeatureStoreObject } from '../../const';
import { useFeatureStoreProject } from '../../FeatureStoreContext';

type FeatureStoreProjectSelectorNavigatorProps = {
  getRedirectPath: (featureStoreObject: FeatureStoreObject, featureStoreProject?: string) => string;
};

const FeatureStoreProjectSelectorNavigator: React.FC<FeatureStoreProjectSelectorNavigatorProps> = ({
  getRedirectPath,
}) => {
  const navigate = useNavigate();
  const currentFeatureStoreObject = useFeatureStoreObject();
  const { currentProject, updatePreferredFeatureStoreProject } = useFeatureStoreProject();

  return (
    <FeatureStoreProjectSelector
      onSelection={(featureStoreObject: FeatureStoreObject, featureStoreProject?: string) => {
        updatePreferredFeatureStoreProject(featureStoreProject || null);
        navigate(getRedirectPath(featureStoreObject, featureStoreProject));
      }}
      featureStoreProject={currentProject ?? ''}
      featureStoreObject={currentFeatureStoreObject}
    />
  );
};

export default FeatureStoreProjectSelectorNavigator;
