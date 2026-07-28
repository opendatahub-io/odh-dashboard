import * as React from 'react';
import ProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/ProjectSelector';
import { FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import {
  AGENT_OPS_PROJECTS_LOAD_ERROR_MESSAGE,
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
  const { projectNamespaces, isLoading, loadError, onProjectSelection } =
    useAgentOpsProjectNamespaces();

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
      {loadError ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="error">{AGENT_OPS_PROJECTS_LOAD_ERROR_MESSAGE}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : null}
    </div>
  );
};

export default AgentOpsProjectSelector;
