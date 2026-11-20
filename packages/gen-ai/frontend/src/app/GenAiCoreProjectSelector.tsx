import { useTrackEvent } from '@odh-dashboard/analytics/react';
import * as React from 'react';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { useNavigate } from 'react-router-dom';
import { useNamespaceSelectorWithPersistence } from './hooks/useNamespaceSelectorWithPersistence';

type PipelineCoreProjectSelectorProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const GenAiCoreProjectSelector: React.FC<PipelineCoreProjectSelectorProps> = ({
  getRedirectPath,
  namespace,
  ...projectSelectorProps
}) => {
  const trackEvent = useTrackEvent();
  const navigate = useNavigate();
  const { namespaces, updatePreferredNamespace, namespacesLoaded } =
    useNamespaceSelectorWithPersistence();

  return (
    <ProjectSelector
      {...projectSelectorProps}
      onSelection={(projectName) => {
        const match = projectName
          ? (namespaces.find((n) => n.name === projectName) ?? undefined)
          : undefined;
        trackEvent('GenAI Project Dropdown Option Selected', {
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
