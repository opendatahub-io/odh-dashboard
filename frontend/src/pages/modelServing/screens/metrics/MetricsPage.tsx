import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, PageSection } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { BreadcrumbItemType } from '~/types';
import ApplicationsPage from '~/pages/ApplicationsPage';
import MetricsPageToolbar from './MetricsPageToolbar';

type MetricsPageProps = {
  children: React.ReactNode;
  title: string;
  breadcrumbItems: BreadcrumbItemType[];
};

const MetricsPage: React.FC<MetricsPageProps> = ({ children, title, breadcrumbItems }) => (
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
    toolbar={<MetricsPageToolbar />}
    loaded
    description={null}
    empty={false}
  >
    <PageSection isFilled>{children}</PageSection>
  </ApplicationsPage>
);

export default MetricsPage;
