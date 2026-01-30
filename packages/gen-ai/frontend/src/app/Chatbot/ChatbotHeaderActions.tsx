import React from 'react';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Tooltip,
} from '@patternfly/react-core';
import { CodeIcon, ColumnsIcon, EllipsisVIcon, PlusIcon } from '@patternfly/react-icons';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { useChatbotConfigStore, selectSelectedModel, selectConfigIds } from './store';

type ChatbotHeaderActionsProps = {
  onViewCode: () => void;
  onConfigurePlayground: () => void;
  onDeletePlayground: () => void;
  onNewChat: () => void;
  onCompareChat: () => void;
  isCompareMode: boolean;
};

const ChatbotHeaderActions: React.FC<ChatbotHeaderActionsProps> = ({
  onViewCode,
  onConfigurePlayground,
  onDeletePlayground,
  onNewChat,
  onCompareChat,
  isCompareMode,
}) => {
  const { lsdStatus, lastInput } = React.useContext(ChatbotContext);
  // Might need to iterate through selectedModels for each config during comparison mode
  const configIds = useChatbotConfigStore(selectConfigIds);
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configIds[0]));
  const isViewCodeDisabled = !lastInput || !selectedModel;
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);

  // Get disabled reason for popover
  const getDisabledReason = () => {
    if (!lastInput && !selectedModel) {
      return 'Please input a message and select a model to generate code';
    }
    if (!lastInput) {
      return 'Please input a message to generate code';
    }
    if (!selectedModel) {
      return 'Please select a model to generate code';
    }
    return '';
  };

  return (
    <ActionList>
      <ActionListGroup>
        {lsdStatus?.phase === 'Ready' && (
          <>
            {/* Hide compare button when in compare mode - use close button on pane to exit */}
            {!isCompareMode && (
              <ActionListItem>
                <Button
                  variant="link"
                  aria-label="Compare chat"
                  icon={<ColumnsIcon />}
                  onClick={onCompareChat}
                  data-testid="compare-chat-button"
                >
                  Compare chat
                </Button>
              </ActionListItem>
            )}
            <ActionListItem>
              <Button
                variant="link"
                aria-label="Start new chat"
                icon={<PlusIcon />}
                onClick={onNewChat}
                data-testid="new-chat-button"
              >
                New chat
              </Button>
            </ActionListItem>
            <ActionListItem>
              {isViewCodeDisabled ? (
                <Tooltip content={getDisabledReason()}>
                  <Button
                    variant="secondary"
                    aria-label="View generated code (disabled)"
                    icon={<CodeIcon />}
                    isAriaDisabled={isViewCodeDisabled}
                    data-testid="view-code-button"
                  >
                    View code
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  variant="secondary"
                  aria-label="View generated code"
                  icon={<CodeIcon />}
                  onClick={onViewCode}
                  data-testid="view-code-button"
                >
                  View Code
                </Button>
              )}
            </ActionListItem>
          </>
        )}
        <ActionListItem>
          <Dropdown
            onSelect={() => setDropdownOpen(false)}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setDropdownOpen(!isDropdownOpen)}
                variant="plain"
                isExpanded={isDropdownOpen}
                aria-label="Action list single group kebab"
                icon={<EllipsisVIcon />}
                data-testid="header-kebab-menu-toggle"
              />
            )}
            isOpen={isDropdownOpen}
            onOpenChange={(isOpen) => setDropdownOpen(isOpen)}
            popperProps={{ position: 'end', preventOverflow: true }}
          >
            <DropdownList>
              <DropdownItem
                onClick={onConfigurePlayground}
                key="update-configuration"
                isDisabled={!lsdStatus}
                data-testid="configure-playground-menu-item"
              >
                Update configuration
              </DropdownItem>
              <Divider />
              <DropdownItem
                onClick={onDeletePlayground}
                key="delete-playground"
                isDisabled={!lsdStatus}
                data-testid="delete-playground-menu-item"
              >
                Delete playground
              </DropdownItem>
            </DropdownList>
          </Dropdown>
        </ActionListItem>
      </ActionListGroup>
    </ActionList>
  );
};

export default ChatbotHeaderActions;
