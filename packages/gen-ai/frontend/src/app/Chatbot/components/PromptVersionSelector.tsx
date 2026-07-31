import * as React from 'react';
import {
  Badge,
  Button,
  Divider,
  Flex,
  FlexItem,
  Menu,
  MenuContainer,
  MenuContent,
  MenuFooter,
  MenuItem,
  MenuList,
  MenuSearch,
  MenuSearchInput,
  MenuToggle,
  SearchInput,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { mlflowPromptManagementBaseRoute } from '@odh-dashboard/internal/routes/pipelines/mlflow';
import { MLflowPrompt, MLflowPromptVersion } from '~/app/types';
import { usePromptVersions } from '~/app/Chatbot/components/promptManagementModal/usePromptQueries';

type PromptVersionSelectorProps = {
  promptName: string;
  promptScope?: MLflowPrompt['scope'];
  currentVersion: number;
  onVersionSelect: (version: MLflowPromptVersion) => void;
  namespace?: string;
};

const isValidVersion = (v: unknown): v is MLflowPromptVersion => {
  if (typeof v !== 'object' || v == null) {
    return false;
  }
  if (!('name' in v) || typeof v.name !== 'string') {
    return false;
  }
  if (!('version' in v) || typeof v.version !== 'number') {
    return false;
  }
  if ('template' in v && v.template != null && typeof v.template !== 'string') {
    return false;
  }
  if ('messages' in v && v.messages != null) {
    if (!Array.isArray(v.messages)) {
      return false;
    }
    if (
      !v.messages.every(
        (m: unknown) =>
          typeof m === 'object' && m != null && 'role' in m && typeof m.role === 'string',
      )
    ) {
      return false;
    }
  }
  return true;
};

const PromptVersionSelector: React.FC<PromptVersionSelectorProps> = ({
  promptName,
  promptScope,
  currentVersion,
  onVersionSelect,
  namespace,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const { versions: rawVersions, isLoading, error } = usePromptVersions(promptName, promptScope);

  const versions = React.useMemo(() => rawVersions.filter(isValidVersion), [rawVersions]);

  const latestVersion = versions.length > 0 ? versions[0].version : null;
  const isLatest = currentVersion === latestVersion;

  const filteredVersions = versions.filter(
    (v) =>
      searchValue === '' ||
      `Version ${v.version}`.toLowerCase().includes(searchValue.toLowerCase()),
  );

  const menuItems = filteredVersions.map((v) => (
    <MenuItem
      key={v.version}
      itemId={v.version}
      isSelected={v.version === currentVersion}
      data-testid={`prompt-version-item-${v.version}`}
    >
      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>{`Version ${v.version}`}</FlexItem>
        {v.version === latestVersion && (
          <FlexItem>
            <Badge color="blue">Latest</Badge>
          </FlexItem>
        )}
      </Flex>
    </MenuItem>
  ));

  if (error && !isLoading) {
    menuItems.push(
      <MenuItem isDisabled key="error" data-testid="prompt-version-error">
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
          </FlexItem>
          <FlexItem>Unable to load versions</FlexItem>
        </Flex>
      </MenuItem>,
    );
  } else if (searchValue.length > 0 && filteredVersions.length === 0) {
    menuItems.push(
      <MenuItem isDisabled key="no-results">
        No results found
      </MenuItem>,
    );
  }

  const menu = (
    <Menu
      onSelect={(_e, itemId) => {
        if (typeof itemId === 'number') {
          const selected = versions.find((v) => v.version === itemId);
          if (selected && selected.version !== currentVersion) {
            onVersionSelect(selected);
          }
          setIsOpen(false);
        }
      }}
      ref={menuRef}
      isScrollable
      activeItemId={currentVersion}
      data-testid="prompt-version-selector-menu"
    >
      <MenuSearch>
        <MenuSearchInput>
          <SearchInput
            data-testid="prompt-version-search"
            value={searchValue}
            aria-label="Find by version name"
            placeholder="Find by version name"
            onChange={(_event, value) => setSearchValue(value)}
          />
        </MenuSearchInput>
      </MenuSearch>
      <Divider />
      <MenuContent>
        <MenuList data-testid="prompt-version-selector-list">{menuItems}</MenuList>
      </MenuContent>
      <MenuFooter>
        <Link to={mlflowPromptManagementBaseRoute(namespace)} style={{ textDecoration: 'none' }}>
          <Button
            isInline
            variant="link"
            data-testid="prompt-view-all-versions"
          >{`View all ${versions.length} versions`}</Button>
        </Link>
      </MenuFooter>
    </Menu>
  );

  return (
    <MenuContainer
      isOpen={isOpen}
      toggleRef={toggleRef}
      toggle={
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen((prev) => !prev)}
          isExpanded={isOpen}
          size="sm"
          data-testid="prompt-version-toggle"
          status={error ? 'danger' : undefined}
          icon={isLoading ? <Spinner size="sm" aria-label="Loading versions" /> : undefined}
        >
          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>{`Version ${currentVersion}`}</FlexItem>
            {isOpen && isLatest && (
              <FlexItem>
                <Badge color="blue">Latest</Badge>
              </FlexItem>
            )}
          </Flex>
        </MenuToggle>
      }
      menu={menu}
      menuRef={menuRef}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setSearchValue('');
        }
      }}
    />
  );
};

export default PromptVersionSelector;
