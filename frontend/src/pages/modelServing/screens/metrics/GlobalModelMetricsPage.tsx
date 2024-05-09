import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import { PerformanceMetricType } from '~/pages/modelServing/screens/types';
import MetricsPage from './MetricsPage';
import { GlobalModelMetricsOutletContextProps } from './GlobalModelMetricsWrapper';

const GlobalModelMetricsPage: React.FC = () => {
  const { model } = useOutletContext<GlobalModelMetricsOutletContextProps>();
  const modelDisplayName = getInferenceServiceDisplayName(model);
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
      model={model}
      type={PerformanceMetricType.MODEL}
    />
  );
};

export default GlobalModelMetricsPage;
