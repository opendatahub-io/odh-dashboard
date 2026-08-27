import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  type MenuToggleElement,
} from '@patternfly/react-core';
import { useSelectedWorkspace } from './WorkspaceContext';

// Project/namespace-selector-style picker for OpenShell workspaces. The chosen
// workspace scopes the sandboxes list; "Go to workspace" opens the workspace's
// full management page (providers, policies, members, inference).
const WorkspaceSelector: React.FC = () => {
  const { workspace, setWorkspace, workspaces } = useSelectedWorkspace();
  const [isOpen, setIsOpen] = React.useState(false);

  // Only meaningful once connected and workspaces have loaded.
  if (workspaces.length === 0) {
    return null;
  }

  return (
    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
      <FlexItem>
        <Content component="small">Workspace</Content>
      </FlexItem>
      <FlexItem>
        <Dropdown
          isOpen={isOpen}
          onSelect={() => setIsOpen(false)}
          onOpenChange={setIsOpen}
          toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              ref={toggleRef}
              isExpanded={isOpen}
              onClick={() => setIsOpen((prev) => !prev)}
              data-testid="workspace-selector-toggle"
            >
              {workspace}
            </MenuToggle>
          )}
          shouldFocusToggleOnSelect
        >
          <DropdownList>
            {workspaces.map((ws) => {
              const name = ws.metadata?.name ?? '';
              return (
                <DropdownItem
                  key={name}
                  isSelected={name === workspace}
                  onClick={() => setWorkspace(name)}
                  data-testid={`workspace-option-${name}`}
                >
                  {name}
                </DropdownItem>
              );
            })}
          </DropdownList>
        </Dropdown>
      </FlexItem>
      <FlexItem>
        <Link to={`/ai-hub/agents/workspaces/${workspace}`} data-testid="go-to-workspace-link">
          Go to workspace
        </Link>
      </FlexItem>
    </Flex>
  );
};

export default WorkspaceSelector;
