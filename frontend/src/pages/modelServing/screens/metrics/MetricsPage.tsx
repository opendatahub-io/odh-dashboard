import * as React from 'react';
import { Breadcrumb, Button } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { CogIcon } from '@patternfly/react-icons';
import { BreadcrumbItemType } from '~/types';
import ApplicationsPage from '~/pages/ApplicationsPage';
import MetricsPageTabs from '~/pages/modelServing/screens/metrics/MetricsPageTabs';
import { MetricsTabKeys } from '~/pages/modelServing/screens/metrics/types';
import { MetricType } from '~/pages/modelServing/screens/types';
import { getBreadcrumbItemComponents } from './utils';
import PerformanceTab from './PerformanceTab';

type MetricsPageProps = {
  title: string;
  breadcrumbItems: BreadcrumbItemType[];
  type: MetricType;
};

const MetricsPage: React.FC<MetricsPageProps> = ({ title, breadcrumbItems, type }) => {
  const { tab } = useParams();
  const navigate = useNavigate();

  return (
    <ApplicationsPage
      title={title}
      breadcrumb={<Breadcrumb>{getBreadcrumbItemComponents(breadcrumbItems)}</Breadcrumb>}
      // TODO: decide whether we need to set the loaded based on the feature flag and explainability loaded
      loaded
      description={null}
      empty={false}
      headerAction={
        tab === MetricsTabKeys.BIAS && (
          <Button
            variant="link"
            icon={<CogIcon />}
            onClick={() => navigate('../configure', { replace: true })}
          >
            Configure
          </Button>
        )
      }
    >
      {type === MetricType.RUNTIME ? <PerformanceTab type={type} /> : <MetricsPageTabs />}
    </ApplicationsPage>
  );
};

export default MetricsPage;
