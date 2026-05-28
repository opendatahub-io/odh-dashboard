import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  PageSection,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';

const CreateRolePage: React.FC = () => {
  const { namespace = '' } = useParams<{ namespace: string }>();

  return (
    <ApplicationsPage
      title="Create role"
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/projects">Projects</Link>} />
          <BreadcrumbItem
            render={() => <Link to={`/projects/${namespace}?section=roles`}>{namespace}</Link>}
          />
          <BreadcrumbItem isActive>Create role</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false} data-testid="create-role-page">
        <EmptyState headingLevel="h2" titleText="Create role">
          <EmptyStateBody>Role creation form will be implemented here.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    </ApplicationsPage>
  );
};

export default CreateRolePage;
