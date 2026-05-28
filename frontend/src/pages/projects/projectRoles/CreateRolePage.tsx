import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  PageSection,
  EmptyState,
  EmptyStateBody,
  Spinner,
} from '@patternfly/react-core';
import { Link, Navigate, useParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useAccessReview } from '#~/api/useAccessReview';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';

const CreateRolePage: React.FC = () => {
  const { namespace = '' } = useParams<{ namespace: string }>();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getDisplayNameFromK8sResource(currentProject);

  const [allowCreate, loaded] = useAccessReview({
    group: 'rbac.authorization.k8s.io',
    resource: 'roles',
    namespace,
    verb: 'create',
  });

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!allowCreate) {
    return <Navigate to={`/projects/${namespace}?section=roles`} replace />;
  }

  return (
    <ApplicationsPage
      title="Create role"
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/projects">Projects</Link>} />
          <BreadcrumbItem
            render={() => <Link to={`/projects/${namespace}?section=roles`}>{displayName}</Link>}
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
