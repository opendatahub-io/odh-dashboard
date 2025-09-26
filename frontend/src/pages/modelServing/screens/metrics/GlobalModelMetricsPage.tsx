import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { PerformanceMetricType } from '#~/pages/modelServing/screens/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import MetricsPage from './MetricsPage';
import { GlobalModelMetricsOutletContextProps } from './GlobalModelMetricsWrapper';

const GlobalModelMetricsPage: React.FC = () => {
  const { model } = useOutletContext<GlobalModelMetricsOutletContextProps>();
  const modelDisplayName = getDisplayNameFromK8sResource(model);
  return (
    <MetricsPage
      title={`${modelDisplayName} metrics`}
      breadcrumbItems={[
        { label: 'Deployments', link: '/ai-hub/deployments' },
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
