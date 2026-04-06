import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { useNamespaceSelector } from 'mod-arch-core';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

type ProjectSelectorNavigatorProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const ProjectSelectorNavigator: React.FC<ProjectSelectorNavigatorProps> = ({
  getRedirectPath,
  namespace,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespaces, updatePreferredNamespace, namespacesLoaded } = useNamespaceSelector();

  return (
    <ProjectSelector
      {...projectSelectorProps}
      onSelection={(projectName) => {
        const match = projectName
          ? (namespaces.find((n) => n.name === projectName) ?? undefined)
          : undefined;
        fireMiscTrackingEvent('AutoRAG Project Dropdown Option Selected', {
          selectedProject: projectName,
        });
        updatePreferredNamespace(match);
        navigate(getRedirectPath(projectName));
      }}
      namespace={namespace ?? ''}
      isLoading={!namespacesLoaded}
      namespacesOverride={namespaces}
    />
  );
};

export default ProjectSelectorNavigator;
