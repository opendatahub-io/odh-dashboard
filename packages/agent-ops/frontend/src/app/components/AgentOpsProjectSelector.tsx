import * as React from 'react';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { useNavigate } from 'react-router-dom';
import {
  getEffectiveProjectNamespaces,
  useAgentOpsProjectNamespaces,
} from '~/app/hooks/useAgentOpsProjectNamespaces';

type AgentOpsProjectSelectorProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;

const AgentOpsProjectSelector: React.FC<AgentOpsProjectSelectorProps> = ({
  getRedirectPath,
  namespace,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { projectNamespaces, isLoading, onProjectSelection } = useAgentOpsProjectNamespaces();

  const effectiveNamespaces = React.useMemo(
    () => getEffectiveProjectNamespaces(projectNamespaces, isLoading, namespace),
    [projectNamespaces, isLoading, namespace],
  );

  return (
    <div data-testid="agent-ops-project-selector">
      <ProjectSelector
        {...projectSelectorProps}
        onSelection={(projectName) => {
          onProjectSelection(projectName);
          navigate(getRedirectPath(projectName));
        }}
        namespace={namespace ?? ''}
        isLoading={isLoading}
        namespacesOverride={effectiveNamespaces}
      />
    </div>
  );
};

export default AgentOpsProjectSelector;
