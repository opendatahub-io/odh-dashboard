import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import BiasConfigurationPage from './BiasConfigurationPage';
import { GlobalModelMetricsOutletContextProps } from '../../GlobalModelMetricsWrapper';

const BiasConfigurationBreadcrumbPage: React.FC = () => {
  const { model, projectName } = useOutletContext<GlobalModelMetricsOutletContextProps>();
  const modelDisplayName = getDisplayNameFromK8sResource(model);
  return (
    <BiasConfigurationPage
      breadcrumbItems={[
        { label: 'Deployments', link: '/ai-hub/models/deployments' },
        {
          label: modelDisplayName,
          link: `/ai-hub/models/deployments/${projectName}/metrics/${model.metadata.name}`,
        },
        { label: 'Metric configuration', isActive: true },
      ]}
      inferenceService={model}
    />
  );
};

export default BiasConfigurationBreadcrumbPage;
