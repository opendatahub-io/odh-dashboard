import React from 'react';
import {
  Button,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
  SearchInput,
  Tooltip,
} from '@patternfly/react-core';
import { FilterIcon, PlusIcon } from '@patternfly/react-icons';
import { APIKey, APIKeyStatus, ApiKeyFilterDataType, STATUS_OPTIONS } from '~/app/types/api-key';
import ApiKeysActions from '~/app/pages/api-keys/ApiKeysActions';

type ApiKeysToolbarProps = {
  setIsModalOpen: (isOpen: boolean) => void;
  filterData: ApiKeyFilterDataType;
  localUsername: string;
  setLocalUsername: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onStatusToggle: (status: APIKeyStatus) => void;
  onStatusClear: (status: APIKeyStatus) => void;
  activeApiKeys: APIKey[];
  isMaasAdmin: boolean;
  refresh: () => void;
  onClearFilters: () => void;
};

const ApiKeysToolbar: React.FC<ApiKeysToolbarProps> = ({
  setIsModalOpen,
  filterData,
  localUsername,
  setLocalUsername,
  onUsernameChange,
  onStatusToggle,
  onStatusClear,
  activeApiKeys,
  isMaasAdmin,
  refresh,
  onClearFilters,
}) => {
  const [isStatusSelectOpen, setIsStatusSelectOpen] = React.useState(false);

  return (
    <Toolbar
      clearAllFilters={() => {
        setLocalUsername('');
        onUsernameChange('');
        onClearFilters();
      }}
      data-testid="api-keys-toolbar"
    >
      <ToolbarContent>
        <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="md">
          <ToolbarGroup variant="filter-group">
            <ToolbarFilter
              labels={filterData.statuses.map((s) => ({
                key: s,
                node: (
                  <span data-testid={`status-chip-${s}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                ),
              }))}
              deleteLabel={(_category, label) => {
                const key = typeof label === 'string' ? label : label.key;
                if (key === 'active' || key === 'expired' || key === 'revoked') {
                  onStatusClear(key);
                }
              }}
              categoryName="Status"
            >
              <Select
                aria-label="Filter by status"
                isOpen={isStatusSelectOpen}
                selected={filterData.statuses}
                onSelect={(_event, value) => {
                  if (value === 'active' || value === 'expired' || value === 'revoked') {
                    onStatusToggle(value);
                  }
                }}
                onOpenChange={setIsStatusSelectOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    data-testid="api-key-status-filter-toggle"
                    onClick={() => setIsStatusSelectOpen((prev) => !prev)}
                    isExpanded={isStatusSelectOpen}
                  >
                    Status
                  </MenuToggle>
                )}
                popperProps={{ appendTo: 'inline' }}
              >
                <SelectList isAriaMultiselectable>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectOption
                      key={status}
                      value={status}
                      hasCheckbox
                      isSelected={filterData.statuses.includes(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarFilter>
            {isMaasAdmin && (
              <ToolbarFilter
                labels={filterData.username ? [filterData.username] : []}
                deleteLabel={() => {
                  setLocalUsername('');
                  onUsernameChange('');
                }}
                categoryName="Username"
              >
                <Tooltip
                  content="Please enter the full username"
                  data-testid="username-filter-tooltip"
                >
                  <SearchInput
                    aria-label="Filter by username"
                    placeholder="Filter by username"
                    data-testid="username-filter-input"
                    value={localUsername}
                    onChange={(_event, value) => {
                      setLocalUsername(value);
                    }}
                    onSearch={(_event, value) => onUsernameChange(value)}
                    onClear={() => {
                      setLocalUsername('');
                      onUsernameChange('');
                    }}
                  />
                </Tooltip>
              </ToolbarFilter>
            )}
          </ToolbarGroup>
        </ToolbarToggleGroup>
        <ToolbarGroup>
          <ToolbarItem>
            <>
              <Button
                variant="primary"
                icon={<PlusIcon />}
                onClick={() => setIsModalOpen(true)}
                data-testid="create-api-key-button"
              >
                Create API key
              </Button>
              <ApiKeysActions
                apiKeyCount={activeApiKeys.length}
                isMaasAdmin={isMaasAdmin}
                onRefresh={refresh}
              />
            </>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

export default ApiKeysToolbar;
