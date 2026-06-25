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
import { FilterIcon } from '@patternfly/react-icons';
import ApiKeysActions from '~/app/pages/keys-and-subs/apiKeys/ApiKeysActions';
import {
  APIKey,
  APIKeyDisplayStatus,
  ApiKeyFilterDataType,
  STATUS_OPTIONS,
  SubscriptionOption,
} from '~/app/types/api-key';

const STATUS_SET: ReadonlySet<string> = new Set(STATUS_OPTIONS);

const isAPIKeyDisplayStatus = (value: unknown): value is APIKeyDisplayStatus =>
  typeof value === 'string' && STATUS_SET.has(value);

type ApiKeysToolbarProps = {
  setIsModalOpen: (isOpen: boolean) => void;
  filterData: ApiKeyFilterDataType;
  localUsername: string;
  setLocalUsername: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onStatusToggle: (status: APIKeyDisplayStatus) => void;
  onStatusClear: (status: APIKeyDisplayStatus) => void;
  subscriptions: SubscriptionOption[];
  onSubscriptionChange: (subscription: string) => void;
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
  subscriptions,
  onSubscriptionChange,
  activeApiKeys,
  isMaasAdmin,
  refresh,
  onClearFilters,
}) => {
  const [isStatusSelectOpen, setIsStatusSelectOpen] = React.useState(false);
  const [isSubscriptionSelectOpen, setIsSubscriptionSelectOpen] = React.useState(false);

  const selectedSubscriptionLabel = React.useMemo(() => {
    if (!filterData.subscription) {
      return undefined;
    }
    const match = subscriptions.find((s) => s.name === filterData.subscription);
    return match?.displayName ?? filterData.subscription;
  }, [filterData.subscription, subscriptions]);

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
                if (isAPIKeyDisplayStatus(key)) {
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
                  if (isAPIKeyDisplayStatus(value)) {
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
            {subscriptions.length > 0 && (
              <ToolbarFilter
                labels={selectedSubscriptionLabel ? [selectedSubscriptionLabel] : []}
                deleteLabel={() => onSubscriptionChange('')}
                categoryName="Subscription"
              >
                <Select
                  aria-label="Filter by subscription"
                  isOpen={isSubscriptionSelectOpen}
                  selected={filterData.subscription || undefined}
                  onSelect={(_event, value) => {
                    onSubscriptionChange(typeof value === 'string' ? value : '');
                    setIsSubscriptionSelectOpen(false);
                  }}
                  onOpenChange={setIsSubscriptionSelectOpen}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      data-testid="api-key-subscription-filter-toggle"
                      onClick={() => setIsSubscriptionSelectOpen((prev) => !prev)}
                      isExpanded={isSubscriptionSelectOpen}
                    >
                      Subscription
                    </MenuToggle>
                  )}
                  popperProps={{ appendTo: 'inline' }}
                >
                  <SelectList>
                    <SelectOption
                      value=""
                      isSelected={!filterData.subscription}
                      data-testid="subscription-filter-option-all"
                    >
                      All subscriptions
                    </SelectOption>
                    {subscriptions.map((sub) => (
                      <SelectOption
                        key={sub.name}
                        value={sub.name}
                        isSelected={filterData.subscription === sub.name}
                        data-testid={`subscription-filter-option-${sub.name}`}
                      >
                        {sub.displayName}
                      </SelectOption>
                    ))}
                  </SelectList>
                </Select>
              </ToolbarFilter>
            )}
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
