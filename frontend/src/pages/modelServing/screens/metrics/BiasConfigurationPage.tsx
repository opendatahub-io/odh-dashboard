import * as React from 'react';
import { Breadcrumb, Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { BreadcrumbItemType } from '~/types';
import { MetricsTabKeys } from './types';
import BiasConfigurationTable from './BiasConfigurationTable';
import { getBreadcrumbItemComponents } from './utils';
import { mockBiasConfigurations } from './mockConfigurations';

type BiasConfigurationPageProps = {
  breadcrumbItems: BreadcrumbItemType[];
};

const BiasConfigurationPage: React.FC<BiasConfigurationPageProps> = ({ breadcrumbItems }) => {
  const navigate = useNavigate();
  return (
    <ApplicationsPage
      title="Bias metric configuration"
      description="Manage the configuration of model bias metrics."
      breadcrumb={<Breadcrumb>{getBreadcrumbItemComponents(breadcrumbItems)}</Breadcrumb>}
      headerAction={
        // TODO: show different text based on the empty status of the configuration
        <Button onClick={() => navigate(`../${MetricsTabKeys.BIAS}`, { relative: 'path' })}>
          View metrics
        </Button>
      }
      loaded
      provideChildrenPadding
      empty={false}
    >
      <BiasConfigurationTable configurations={mockBiasConfigurations} />
    </ApplicationsPage>
  );
};

export default BiasConfigurationPage;
