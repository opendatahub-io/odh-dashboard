import React from 'react';
import {
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { CodeIcon, ColumnsIcon, CogIcon, EllipsisVIcon, PlusIcon } from '@patternfly/react-icons';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { AGENT_CONFIG_MANAGEMENT } from '~/odh/extensions';
import { useChatbotConfigStore, selectSelectedModel, selectConfigIds } from './store';

type ChatbotHeaderActionsProps = {
  onViewCode: () => void;
  onConfigurePlayground: () => void;
  onDeletePlayground: () => void;
  onNewChat: () => void;
  onCompareChat: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onLoad: () => void;
  onNew: () => void;
  onSettingsClick: () => void;
  isSettingsOpen: boolean;
  isCompareMode: boolean;
};

const ChatbotHeaderActions: React.FC<ChatbotHeaderActionsProps> = ({
  onViewCode,
  onConfigurePlayground,
  onDeletePlayground,
  onNewChat,
  onCompareChat,
  onSave,
  onSaveAs,
  onLoad,
  onNew,
  onSettingsClick,
  isSettingsOpen,
  isCompareMode,
}) => {
  const { lsdStatus, lastInput } = React.useContext(ChatbotContext);
  const configIds = useChatbotConfigStore(selectConfigIds);
  const selectedModel = useChatbotConfigStore(selectSelectedModel(configIds[0]));
  const isViewCodeDisabled = !lastInput || !selectedModel;
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);
  const [agentConfigManagementEnabled] = useFeatureFlag(AGENT_CONFIG_MANAGEMENT);
  const profileApplied = useChatbotConfigStore((s) => s.profileApplied);

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
    <Toolbar inset={{ default: 'insetNone' }} className="pf-m-full-width" style={{ padding: 0 }}>
      <ToolbarContent
        className="pf-v6-u-flex-nowrap"
        style={{ padding: 0, justifyContent: 'flex-end' }}
      >
        {lsdStatus?.phase === 'Ready' && (
          <>
            {/* Hide compare button when in compare mode - use close button on pane to exit */}
            {!isCompareMode && (
              <ToolbarItem>
                {profileApplied ? (
                  <Tooltip content="Comparison mode is not available when an agent configuration is loaded.">
                    <Button
                      variant="link"
                      aria-label="Compare chat (disabled)"
                      icon={<ColumnsIcon />}
                      isAriaDisabled
                      data-testid="compare-chat-button"
                    >
                      Compare chat
                    </Button>
                  </Tooltip>
                ) : (
                  <Button
                    variant="link"
                    aria-label="Compare chat"
                    icon={<ColumnsIcon />}
                    onClick={onCompareChat}
                    data-testid="compare-chat-button"
                  >
                    Compare chat
                  </Button>
                )}
              </ToolbarItem>
            )}
            <ToolbarItem>
              <Button
                variant="link"
                aria-label="Start a new chat session"
                icon={<PlusIcon />}
                onClick={onNewChat}
                data-testid="new-chat-button"
              >
                New chat
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              {isViewCodeDisabled ? (
                <Tooltip content={getDisabledReason()}>
                  <Button
                    variant="link"
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
                  variant="link"
                  aria-label="View generated code"
                  icon={<CodeIcon />}
                  onClick={onViewCode}
                  data-testid="view-code-button"
                >
                  View code
                </Button>
              )}
            </ToolbarItem>
            <ToolbarItem variant="separator" />
            <ToolbarItem>
              <Button
                variant="link"
                aria-label="Settings"
                aria-expanded={isSettingsOpen}
                icon={<CogIcon />}
                onClick={onSettingsClick}
                data-testid="settings-button"
              >
                Settings
              </Button>
            </ToolbarItem>
          </>
        )}
        <ToolbarItem>
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
              {agentConfigManagementEnabled && (
                <DropdownItem
                  onClick={!isCompareMode ? onLoad : undefined}
                  isAriaDisabled={isCompareMode}
                  key="load-agent-configuration"
                  data-testid="load-agent-profile-button"
                >
                  Load agent configuration
                </DropdownItem>
              )}
              {agentConfigManagementEnabled && profileApplied && (
                <DropdownItem
                  onClick={!isCompareMode ? onSave : undefined}
                  isAriaDisabled={isCompareMode}
                  key="save-agent-configuration"
                  data-testid="save-agent-profile-button"
                >
                  Save agent configuration
                </DropdownItem>
              )}
              {agentConfigManagementEnabled && (
                <DropdownItem
                  onClick={!isCompareMode ? onSaveAs : undefined}
                  isAriaDisabled={isCompareMode}
                  key="save-as-agent-configuration"
                  data-testid="save-as-agent-profile-button"
                >
                  Save as agent configuration
                </DropdownItem>
              )}
              {agentConfigManagementEnabled && profileApplied && (
                <DropdownItem
                  onClick={!isCompareMode ? onNew : undefined}
                  isAriaDisabled={isCompareMode}
                  key="new-agent-configuration"
                  data-testid="new-agent-configuration-button"
                >
                  New agent configuration
                </DropdownItem>
              )}
              {agentConfigManagementEnabled && <Divider key="agent-divider" />}
              <DropdownItem
                onClick={onConfigurePlayground}
                key="update-configuration"
                isDisabled={!lsdStatus}
                data-testid="configure-playground-menu-item"
              >
                Update playground
              </DropdownItem>
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
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default ChatbotHeaderActions;
