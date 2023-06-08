import * as React from 'react';
import { Breadcrumb } from '@patternfly/react-core';
import { BreadcrumbItemType } from '~/types';
import ApplicationsPage from '~/pages/ApplicationsPage';
import MetricsPageTabs from '~/pages/modelServing/screens/metrics/MetricsPageTabs';
import { getBreadcrumbItemComponents } from './utils';

type MetricsPageProps = {
  title: string;
  breadcrumbItems: BreadcrumbItemType[];
};

const MetricsPage: React.FC<MetricsPageProps> = ({ title, breadcrumbItems }) => {
  const [headerAction, setHeaderAction] = React.useState<React.ReactNode | null>(null);

  const headerActionCallback = React.useCallback(
    (headerAction: React.ReactNode | null) => setHeaderAction(headerAction),
    [],
  );

  return (
    <ApplicationsPage
      title={title}
      breadcrumb={<Breadcrumb>{getBreadcrumbItemComponents(breadcrumbItems)}</Breadcrumb>}
      loaded
      description={null}
      empty={false}
      headerAction={headerAction}
    >
      <MetricsPageTabs headerAction={headerActionCallback} />
    </ApplicationsPage>
  );
};

export default MetricsPage;
