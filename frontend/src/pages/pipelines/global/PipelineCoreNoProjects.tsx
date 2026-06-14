import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateFooter } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { useNavigate } from 'react-router-dom';
import { useAccessReview } from '#~/api';
import { AccessReviewResourceAttributes } from '#~/k8sTypes';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import NewProjectButton from '#~/pages/projects/screens/projects/NewProjectButton';
import { pipelinesBaseRoute } from '#~/routes/pipelines/global';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'project.openshift.io',
  resource: 'projectrequests',
  verb: 'create',
};

const PipelineCoreNoProjects: React.FC = () => {
  const navigate = useNavigate();
  const [allowCreate, rbacLoaded] = useAccessReview(accessReviewResource);

  return (
    <EmptyState
      headingLevel="h4"
      icon={WrenchIcon}
      titleText="No projects"
      data-testid="empty-state-title"
    >
      <EmptyStateBody>
        To create a pipeline server and import a pipeline, first create a project.
        {rbacLoaded && !allowCreate ? ' To request a project, contact your administrator.' : ''}
      </EmptyStateBody>
      <EmptyStateFooter>
        {rbacLoaded && allowCreate ? (
          <NewProjectButton
            closeOnCreate
            onProjectCreated={(projectName) => navigate(pipelinesBaseRoute(projectName))}
          />
        ) : null}
        {rbacLoaded && !allowCreate ? <WhosMyAdministrator /> : null}
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default PipelineCoreNoProjects;
