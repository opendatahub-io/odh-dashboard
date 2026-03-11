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
} from '@patternfly/react-core';
import { FilterIcon, PlusIcon } from '@patternfly/react-icons';
import { APIKey, APIKeyStatus } from '~/app/types/api-key';
import ApiKeysActions from '../ApiKeysActions';

export const STATUS_OPTIONS: APIKeyStatus[] = ['active', 'expired', 'revoked'];

export type ApiKeyFilterDataType = {
  username: string;
  statuses: APIKeyStatus[];
};

export const initialApiKeyFilterData: ApiKeyFilterDataType = {
  username: '',
  statuses: ['active', 'expired', 'revoked'],
};

type ApiKeysToolbarProps = {
  setIsModalOpen: (isOpen: boolean) => void;
  filterData: ApiKeyFilterDataType;
  onUsernameChange: (value: string) => void;
  onStatusToggle: (status: APIKeyStatus) => void;
  onStatusClear: (status: APIKeyStatus) => void;
  activeApiKeys: APIKey[];
  refresh: () => void;
};

const ApiKeysToolbar: React.FC<ApiKeysToolbarProps> = ({
  setIsModalOpen,
  filterData,
  onUsernameChange,
  onStatusToggle,
  onStatusClear,
  activeApiKeys,
  refresh,
}) => {
  const [isStatusSelectOpen, setIsStatusSelectOpen] = React.useState(false);
  const [localUsername, setLocalUsername] = React.useState('');

  return (
    <Toolbar
      clearAllFilters={() => {
        setLocalUsername('');
        onUsernameChange('');
        STATUS_OPTIONS.forEach(onStatusClear);
      }}
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
            <ToolbarFilter
              labels={filterData.username ? [filterData.username] : []}
              deleteLabel={() => onUsernameChange('')}
              categoryName="Username"
            >
              <SearchInput
                aria-label="Filter by username"
                placeholder="Filter by username"
                data-testid="username-filter-input"
                value={localUsername}
                onSearch={(_event, value) => onUsernameChange(value)}
                onChange={(_event, value) => setLocalUsername(value)}
                onClear={() => {
                  setLocalUsername('');
                  onUsernameChange('');
                }}
              />
            </ToolbarFilter>
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
              <ApiKeysActions apiKeyCount={activeApiKeys.length} onRefresh={refresh} />
            </>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

export default ApiKeysToolbar;
