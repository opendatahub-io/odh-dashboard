import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { GlobalModelMetricsOutletContextProps } from '#~/pages/modelServing/screens/metrics/GlobalModelMetricsWrapper';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import BiasConfigurationPage from './BiasConfigurationPage';

const BiasConfigurationBreadcrumbPage: React.FC = () => {
  const { model, projectName } = useOutletContext<GlobalModelMetricsOutletContextProps>();
  const modelDisplayName = getDisplayNameFromK8sResource(model);
  return (
    <BiasConfigurationPage
      breadcrumbItems={[
        { label: 'Model serving', link: '/modelServing' },
        {
          label: modelDisplayName,
          link: `/modelServing/${projectName}/metrics/${model.metadata.name}`,
        },
        { label: 'Metric configuration', isActive: true },
      ]}
      inferenceService={model}
    />
  );
};

export default BiasConfigurationBreadcrumbPage;
