import React from 'react';
import { FeatureView } from '../../../types/featureView';
import FeatureStoreLineageComponent from '../../lineage/FeatureStoreLineageComponent';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';

interface FeatureViewLineageProps {
  featureView: FeatureView;
}

const FeatureViewLineage: React.FC<FeatureViewLineageProps> = ({ featureView }) => {
  const { currentProject } = useFeatureStoreProject();

  return (
    <FeatureStoreLineageComponent
      project={currentProject}
      featureViewName={featureView.spec.name}
      height="100%"
    />
  );
};

export default FeatureViewLineage;
