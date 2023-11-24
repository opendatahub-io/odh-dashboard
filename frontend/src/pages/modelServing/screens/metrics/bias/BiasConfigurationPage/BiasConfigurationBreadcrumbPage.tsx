import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import { GlobalModelMetricsOutletContextProps } from '~/pages/modelServing/screens/metrics/GlobalModelMetricsWrapper';
import BiasConfigurationPage from './BiasConfigurationPage';

const BiasConfigurationBreadcrumbPage: React.FC = () => {
  const { model, projectName } = useOutletContext<GlobalModelMetricsOutletContextProps>();
  const modelDisplayName = getInferenceServiceDisplayName(model);
  return (
    <BiasConfigurationPage
      breadcrumbItems={[
        { label: 'Model serving', link: '/modelServing' },
        {
          label: modelDisplayName,
          link: `/modelServing/metrics/${projectName}/${model.metadata.name}`,
        },
        { label: 'Metric configuration', isActive: true },
      ]}
      inferenceService={model}
    />
  );
};

export default BiasConfigurationBreadcrumbPage;
