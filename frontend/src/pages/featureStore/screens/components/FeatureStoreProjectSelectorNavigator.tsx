import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { FeatureStoreObject } from '#~/pages/featureStore/const';
import { useFeatureStoreObject } from '#~/pages/featureStore/apiHooks/useFeatureStoreObject';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import FeatureStoreProjectSelector from './FeatureStoreProjectSelector';

type FeatureStoreProjectSelectorNavigatorProps = {
  getRedirectPath: (featureStoreObject: FeatureStoreObject, featureStoreProject?: string) => string;
};

const FeatureStoreProjectSelectorNavigator: React.FC<FeatureStoreProjectSelectorNavigatorProps> = ({
  getRedirectPath,
}) => {
  const navigate = useNavigate();
  const currentFeatureStoreObject = useFeatureStoreObject();
  const { currentProject } = useFeatureStoreProject();

  return (
    <FeatureStoreProjectSelector
      onSelection={(featureStoreObject: FeatureStoreObject, featureStoreProject?: string) => {
        navigate(getRedirectPath(featureStoreObject, featureStoreProject));
      }}
      featureStoreProject={currentProject ?? ''}
      featureStoreObject={currentFeatureStoreObject}
    />
  );
};

export default FeatureStoreProjectSelectorNavigator;
