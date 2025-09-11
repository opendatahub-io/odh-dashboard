import * as React from 'react';
import {
  SearchInput,
  Menu,
  MenuContent,
  MenuItem,
  MenuList,
  MenuGroup,
  Divider,
  Popper,
  MenuSearch,
  Bullseye,
  Content,
  Spinner,
  Flex,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { useSearchState } from './hooks/useSearchState';
import { useSearchHandlers, type ISearchItem } from './hooks/useSearchHandlers';
import { useResponsiveSearch } from './hooks/useResponsiveSearch';
import LoadMoreFooter from './LoadMoreFooter';
import { groupResultsByCategory } from './utils/searchUtils';
import useFeatureStoreProjects from '../../apiHooks/useFeatureStoreProjects';
import FeatureStoreLabels from '../FeatureStoreLabels';

const highlightText = (textContent: string, searchTerm: string): React.ReactNode => {
  if (!searchTerm.trim()) return textContent;

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = textContent.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark
        key={index}
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--pf-t--global--color--status--warning--default) 35%, var(--pf-t--global--background--color--primary--default))',
          color: 'var(--pf-t--global--text--color--regular)',
          padding: '0',
          fontWeight: 'var(--pf-t--global--font--weight--bold)',
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

const renderNoResults = (
  isLoading: boolean,
  isSearching: boolean,
  searchValue: string,
): React.ReactElement => {
  const projectName = 'All repositories';
  const showSearching = isLoading || isSearching;

  return (
    <MenuItem isDisabled data-testid="global-search-no-results">
      {showSearching ? (
        <Bullseye>
          <Spinner size="lg" data-testid="global-search-loading-spinner" />
        </Bullseye>
      ) : (
        <span data-testid="global-search-no-results-text">
          No results found for query &quot;{searchValue}&quot; from {projectName}
        </span>
      )}
    </MenuItem>
  );
};

interface ISearchInputProps {
  data?: ISearchItem[];
  placeholder?: string;
  ariaLabel?: string;
  onSelect?: (item: ISearchItem) => void;
  onSearchChange?: (query: string) => Promise<void>;
  onLoadMore?: () => Promise<void>;
  onClear?: () => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMorePages?: boolean;
  totalCount?: number;
  isDetailsPage?: boolean;
}

const GlobalSearchInput: React.FC<ISearchInputProps> = ({
  data: searchResults = [],
  placeholder = 'Search...',
  ariaLabel = 'Search application',
  onSelect,
  onSearchChange,
  onLoadMore,
  onClear,
  isLoading = false,
  isLoadingMore = false,
  hasMorePages = false,
  totalCount = 0,
  isDetailsPage = false,
}) => {
  const { loaded: projectsLoaded } = useFeatureStoreProjects();
  const searchState = useSearchState({ isLoading });
  const handlers = useSearchHandlers(searchState, {
    onSearchChange,
    onClear,
    onSelect,
  });
  const searchInputContainerRef = React.useRef<HTMLDivElement>(null);
  const { searchInputStyle, searchMenuStyle } = useResponsiveSearch(
    searchState.isSmallScreen,
    searchInputContainerRef,
    isDetailsPage,
  );

  const renderSearchInput = (): React.ReactElement => (
    <div
      ref={searchInputContainerRef}
      style={searchInputStyle}
      data-testid="global-search-input-container"
    >
      <SearchInput
        ref={searchState.searchInputRef}
        value={searchState.searchValue}
        onChange={handlers.handleSearchChange}
        onClear={handlers.handleSearchClear}
        aria-label={ariaLabel}
        placeholder={!projectsLoaded ? 'Loading projects...' : placeholder}
        isDisabled={!projectsLoaded}
        style={!projectsLoaded ? { opacity: 0.6 } : undefined}
        data-testid="global-search-input"
      />
    </div>
  );

  const searchMenu = (
    <Menu
      ref={searchState.searchMenuRef}
      style={searchMenuStyle}
      data-testid="global-search-menu"
      onSelect={(_, itemId) => {
        const selectedItem = searchResults.find(
          (item) => item.id === parseInt(String(itemId || '0')),
        );
        if (selectedItem) {
          handlers.handleResultSelect(selectedItem);
        }
      }}
    >
      {searchResults.length > 0 && (
        <>
          <MenuSearch data-testid="global-search-results-header">
            <Bullseye>
              <Content className={text.textColorLink} data-testid="global-search-results-count">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} from All
                repositories
              </Content>
            </Bullseye>
          </MenuSearch>
          <Divider />
        </>
      )}
      <MenuContent data-testid="global-search-menu-content">
        <MenuList
          style={{ maxHeight: searchState.isSmallScreen ? '300px' : '500px', overflowY: 'auto' }}
          data-testid="global-search-menu-list"
        >
          {isLoading ||
          (searchResults.length === 0 &&
            searchState.searchValue.trim() !== '' &&
            searchState.isSearchOpen) ? (
            renderNoResults(isLoading, searchState.isSearching, searchState.searchValue)
          ) : (
            <>
              {groupResultsByCategory(searchResults).map((group, groupIndex, groups) => (
                <React.Fragment key={group.category}>
                  <MenuGroup
                    label={group.category}
                    data-testid={`global-search-group-${(group.category || 'unknown')
                      .toLowerCase()
                      .replace(/\s+/g, '-')}`}
                  >
                    {group.items.map((item) => (
                      <MenuItem
                        key={item.id}
                        itemId={item.id.toString()}
                        data-testid={`global-search-item-${item.type || 'unknown'}-${(
                          item.title || 'unknown'
                        )
                          .toLowerCase()
                          .replace(/\s+/g, '-')}`}
                      >
                        <Stack hasGutter={false}>
                          <StackItem>
                            <Flex
                              direction={{ default: 'row' }}
                              alignItems={{ default: 'alignItemsCenter' }}
                              gap={{ default: 'gapMd' }}
                            >
                              <Content className={text.textColorRegular}>
                                {highlightText(item.title, searchState.searchValue)}
                              </Content>
                              <FeatureStoreLabels color="blue" isCompact variant="outline">
                                {item.project}
                              </FeatureStoreLabels>
                            </Flex>
                          </StackItem>
                          <StackItem>
                            <Content
                              className={`${text.fontSizeSm} ${text.textColorSubtle}`}
                              style={{
                                marginTop: '0.25rem',
                                display: 'block',
                              }}
                            >
                              {highlightText(item.description, searchState.searchValue)}
                            </Content>
                          </StackItem>
                        </Stack>
                      </MenuItem>
                    ))}
                  </MenuGroup>
                  {groupIndex < groups.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              {searchResults.length > 0 && hasMorePages && (
                <>
                  <Divider />
                  <LoadMoreFooter
                    hasMorePages={hasMorePages}
                    isLoading={isLoadingMore}
                    currentCount={searchResults.length}
                    totalCount={totalCount}
                    onLoadMore={onLoadMore || (() => Promise.resolve())}
                    data-testid="global-search-load-more"
                  />
                </>
              )}
            </>
          )}
        </MenuList>
      </MenuContent>
    </Menu>
  );

  return (
    <Popper
      test-id="global-search-input-popper"
      trigger={renderSearchInput()}
      triggerRef={searchInputContainerRef}
      popper={searchMenu}
      popperRef={searchState.searchMenuRef}
      isVisible={searchState.isSearchOpen && searchState.searchValue.trim() !== ''}
      enableFlip={false}
      placement="bottom-end"
      distance={10}
      appendTo={() => document.body}
    />
  );
};

export { GlobalSearchInput };
export default GlobalSearchInput;
