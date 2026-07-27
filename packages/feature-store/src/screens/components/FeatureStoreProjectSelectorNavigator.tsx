import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import FeatureStoreProjectSelector from './FeatureStoreProjectSelector';
import { useFeatureStoreObject } from '../../apiHooks/useFeatureStoreObject';
import { FeatureStoreObject } from '../../const';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureStoreProjects from '../../apiHooks/useFeatureStoreProjects';
import {
  FEATURE_STORE_EVENTS,
  ProjectSelectedProperties,
} from '../../tracking/featureStoreTrackingConstants';

type FeatureStoreProjectSelectorNavigatorProps = {
  getRedirectPath: (featureStoreObject: FeatureStoreObject, featureStoreProject?: string) => string;
};

const FeatureStoreProjectSelectorNavigator: React.FC<FeatureStoreProjectSelectorNavigatorProps> = ({
  getRedirectPath,
}) => {
  const navigate = useNavigate();
  const currentFeatureStoreObject = useFeatureStoreObject();
  const { currentProject, updatePreferredFeatureStoreProject } = useFeatureStoreProject();
  const { data: featureStoreProjects } = useFeatureStoreProjects();

  return (
    <FeatureStoreProjectSelector
      onSelection={(featureStoreObject: FeatureStoreObject, featureStoreProject?: string) => {
        fireMiscTrackingEvent(FEATURE_STORE_EVENTS.PROJECT_SELECTED, {
          isSwitch: !!currentProject && currentProject !== (featureStoreProject || ''),
          storeCount: featureStoreProjects.projects.length,
          pageType: currentFeatureStoreObject === FeatureStoreObject.OVERVIEW ? 'overview' : 'list',
        } satisfies ProjectSelectedProperties);
        updatePreferredFeatureStoreProject(featureStoreProject || null);
        navigate(getRedirectPath(featureStoreObject, featureStoreProject));
      }}
      featureStoreProject={currentProject ?? ''}
      featureStoreObject={currentFeatureStoreObject}
    />
  );
};

export default FeatureStoreProjectSelectorNavigator;
