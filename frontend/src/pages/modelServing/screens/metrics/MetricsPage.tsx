import * as React from 'react';

import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { BreadcrumbItemType } from '~/types';
import ApplicationsPage from '~/pages/ApplicationsPage';
import MetricsPageTabs from '~/pages/modelServing/screens/metrics/MetricsPageTabs';

type MetricsPageProps = {
  children: React.ReactNode;
  title: string;
  breadcrumbItems: BreadcrumbItemType[];
};

const MetricsPage: React.FC<MetricsPageProps> = ({ title, breadcrumbItems }) => (
  <ApplicationsPage
    title={title}
    breadcrumb={
      <Breadcrumb>
        {breadcrumbItems.map((item) => (
          <BreadcrumbItem
            isActive={item.isActive}
            key={item.label}
            render={() =>
              item.link ? <Link to={item.link}>{item.label}</Link> : <>{item.label}</>
            }
          />
        ))}
      </Breadcrumb>
    }
    loaded
    description={null}
    empty={false}
  >
    <MetricsPageTabs />
  </ApplicationsPage>
);

export default MetricsPage;
