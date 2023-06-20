import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import { MetricType } from '~/pages/modelServing/screens/types';
import MetricsPage from './MetricsPage';
import { GlobalInferenceMetricsOutletContextProps } from './GlobalInferenceMetricsWrapper';

const GlobalInferenceMetricsPage: React.FC = () => {
  const { inferenceService } = useOutletContext<GlobalInferenceMetricsOutletContextProps>();
  const modelDisplayName = getInferenceServiceDisplayName(inferenceService);
  return (
    <MetricsPage
      title={`${modelDisplayName} metrics`}
      breadcrumbItems={[
        { label: 'Model serving', link: '/modelServing' },
        {
          label: modelDisplayName,
          isActive: true,
        },
      ]}
      type={MetricType.INFERENCE}
    />
  );
};

export default GlobalInferenceMetricsPage;
