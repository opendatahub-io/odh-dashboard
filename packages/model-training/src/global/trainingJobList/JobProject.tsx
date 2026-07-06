import * as React from 'react';
import { HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import { ProjectsContext, byName } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { UnifiedJobKind } from '../../types';

type JobProjectProps = {
  job: UnifiedJobKind;
};

const JobProject: React.FC<JobProjectProps> = ({ job }) => {
  const { projects, loaded, loadError } = React.useContext(ProjectsContext);

  if (!loaded) {
    return <Skeleton />;
  }

  if (loadError) {
    return (
      <HelperText>
        <HelperTextItem variant="warning">
          Failed to get project for this job. {loadError.message}
        </HelperTextItem>
      </HelperText>
    );
  }

  const project = projects.find(byName(job.metadata.namespace));

  return <>{project ? getDisplayNameFromK8sResource(project) : job.metadata.namespace}</>;
};

export default JobProject;
