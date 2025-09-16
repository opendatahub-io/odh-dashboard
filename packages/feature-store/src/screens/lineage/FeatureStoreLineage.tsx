import React from 'react';
import FeatureStoreLineageComponent from './FeatureStoreLineageComponent';
import { useFeatureStoreProject } from '../../FeatureStoreContext';

const FeatureStoreLineage: React.FC = () => {
  const { currentProject } = useFeatureStoreProject();

  return <FeatureStoreLineageComponent project={currentProject} height="100%" />;
};

export default FeatureStoreLineage;
