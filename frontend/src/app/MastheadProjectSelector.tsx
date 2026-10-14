import * as React from 'react';
import { getDescriptionFromK8sResource, isAiProject } from '@odh-dashboard/k8s-core';
import type { AccessReviewResourceAttributes } from '@odh-dashboard/k8s-core';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import { useWorkingProject } from '@odh-dashboard/ui-core/context/WorkingProjectContext';
import WorkingProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/WorkingProjectSelector';
import { AILabel } from '#~/pages/projects/screens/projects/AILabel';
import ManageProjectModal from '#~/pages/projects/screens/projects/ManageProjectModal';

const createProjectResource: AccessReviewResourceAttributes = {
  group: 'project.openshift.io',
  resource: 'projectrequests',
  verb: 'create',
};

const MastheadProjectSelector: React.FC = () => {
  const { projects } = React.useContext(ProjectsContext);
  const { selectProject } = useWorkingProject();
  const [allowCreate, permissionsLoaded] = useAccessReview(createProjectResource);
  const [creation, setCreation] = React.useState<'empty' | 'create' | null>(null);
  const projectByName = React.useMemo(
    () => new Map(projects.map((project) => [project.metadata.name, project])),
    [projects],
  );

  return (
    <>
      <WorkingProjectSelector
        getProjectDescription={(name) => {
          const project = projectByName.get(name);
          return project ? getDescriptionFromK8sResource(project) : '';
        }}
        isAiProject={(name) => {
          const project = projectByName.get(name);
          return project ? isAiProject(project) : false;
        }}
        aiLabel={<AILabel />}
        getProjectHref={(name) => `/projects/${encodeURIComponent(name)}`}
        onCreateProject={
          permissionsLoaded && allowCreate
            ? (isEmpty) => setCreation(isEmpty ? 'empty' : 'create')
            : undefined
        }
      />
      {creation && (
        <ManageProjectModal
          title={creation === 'empty' ? 'No projects' : undefined}
          description={
            creation === 'empty'
              ? 'There are no projects available to you in this cluster. Do you want to create one?'
              : undefined
          }
          onClose={(name) => {
            if (name) {
              selectProject({ name });
            }
            setCreation(null);
          }}
        />
      )}
    </>
  );
};

export default MastheadProjectSelector;
