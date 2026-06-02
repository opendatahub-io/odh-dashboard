import * as React from 'react';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { useNavigate } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';

type PipelineCoreProjectSelectorProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const GenAiCoreProjectSelector: React.FC<PipelineCoreProjectSelectorProps> = ({
  getRedirectPath,
  namespace,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespaces, updatePreferredNamespace, namespacesLoaded } =
    useNamespaceSelectorWithPersistence();

  return (
    <ProjectSelector
      {...projectSelectorProps}
      onSelection={(projectName) => {
        const match = projectName
          ? namespaces.find((n) => n.name === projectName) ?? undefined
          : undefined;
        fireMiscTrackingEvent('GenAI Project Dropdown Option Selected', {
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

export default GenAiCoreProjectSelector;
