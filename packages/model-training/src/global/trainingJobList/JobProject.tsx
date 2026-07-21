import * as React from 'react';
import { HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { byName, getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
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
