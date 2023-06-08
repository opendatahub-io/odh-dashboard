import * as React from 'react';
import { Breadcrumb, Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { BreadcrumbItemType } from '~/types';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import { InferenceServiceKind } from '~/k8sTypes';
import { getInferenceServiceDisplayName } from '~/pages/modelServing/screens/global/utils';
import { MetricsTabKeys } from './types';
import BiasConfigurationTable from './BiasConfigurationTable';
import { getBreadcrumbItemComponents } from './utils';

type BiasConfigurationPageProps = {
  breadcrumbItems: BreadcrumbItemType[];
  inferenceService: InferenceServiceKind;
};

const BiasConfigurationPage: React.FC<BiasConfigurationPageProps> = ({
  breadcrumbItems,
  inferenceService,
}) => {
  const { biasMetricConfigs, loaded } = useExplainabilityModelData();
  const navigate = useNavigate();
  return (
    <ApplicationsPage
      title="Bias metric configuration"
      description="Manage the configuration of model bias metrics."
      breadcrumb={<Breadcrumb>{getBreadcrumbItemComponents(breadcrumbItems)}</Breadcrumb>}
      headerAction={
        <Button onClick={() => navigate(`../${MetricsTabKeys.BIAS}`, { relative: 'path' })}>
          {biasMetricConfigs.length === 0
            ? `Back to ${getInferenceServiceDisplayName(inferenceService)}`
            : 'View metrics'}
        </Button>
      }
      loaded={loaded}
      provideChildrenPadding
      // The page is not empty, we will handle the empty state in the table
      empty={false}
    >
      <BiasConfigurationTable inferenceService={inferenceService} />
    </ApplicationsPage>
  );
};

export default BiasConfigurationPage;
