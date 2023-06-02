import * as React from 'react';
import { Breadcrumb, Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { BreadcrumbItemType } from '~/types';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import { MetricsTabKeys } from './types';
import BiasConfigurationTable from './BiasConfigurationTable';
import { getBreadcrumbItemComponents } from './utils';

type BiasConfigurationPageProps = {
  breadcrumbItems: BreadcrumbItemType[];
  modelDisplayName: string;
};

const BiasConfigurationPage: React.FC<BiasConfigurationPageProps> = ({
  breadcrumbItems,
  modelDisplayName,
}) => {
  const { biasMetricConfigs, loaded } = useExplainabilityModelData();
  const emptyConfiguration = biasMetricConfigs.length === 0;
  const navigate = useNavigate();
  return (
    <ApplicationsPage
      title="Bias metric configuration"
      description="Manage the configuration of model bias metrics."
      breadcrumb={<Breadcrumb>{getBreadcrumbItemComponents(breadcrumbItems)}</Breadcrumb>}
      headerAction={
        <Button onClick={() => navigate(`../${MetricsTabKeys.BIAS}`, { relative: 'path' })}>
          {emptyConfiguration ? `Back to ${modelDisplayName}` : 'View metrics'}
        </Button>
      }
      loaded={loaded}
      provideChildrenPadding
      // The page is not empty, we will handle the empty state in the table
      empty={false}
    >
      <BiasConfigurationTable configurations={biasMetricConfigs} />
    </ApplicationsPage>
  );
};

export default BiasConfigurationPage;
