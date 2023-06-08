import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import BiasConfigurationPage from './BiasConfigurationPage';
import { GlobalInferenceMetricsOutletContextProps } from './GlobalInferenceMetricsWrapper';

const BiasConfigurationBreadcrumbPage: React.FC = () => {
  const { inferenceService, projectName } =
    useOutletContext<GlobalInferenceMetricsOutletContextProps>();
  const modelDisplayName = getInferenceServiceDisplayName(inferenceService);
  return (
    <BiasConfigurationPage
      breadcrumbItems={[
        { label: 'Model serving', link: '/modelServing' },
        {
          label: modelDisplayName,
          link: `/modelServing/metrics/${projectName}/${inferenceService.metadata.name}`,
        },
        { label: 'Metric configuration', isActive: true },
      ]}
      inferenceService={inferenceService}
    />
  );
};

export default BiasConfigurationBreadcrumbPage;
