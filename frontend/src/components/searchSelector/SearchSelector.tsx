import * as React from 'react';
import {
  Divider,
  HelperText,
  HelperTextItem,
  Icon,
  Menu,
  MenuContainer,
  MenuContent,
  MenuList,
  MenuSearch,
  MenuSearchInput,
  MenuToggle,
  SearchInput,
  Spinner,
  Truncate,
} from '@patternfly/react-core';

type ManualSearchSelectorOpts = {
  menuClose: () => void;
};

type SearchSelectorProps = {
  /**
   * A function if you need additional control over children's ability to close the modal.
   * If you supply children directly, selection of a MenuItem will close the dropdown.
   *
   * Resulting children (React.ReactNode) can be anything that can be rendered inside <MenuList />.
   */
  children: ((opts: ManualSearchSelectorOpts) => React.ReactNode) | React.ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
  dataTestId: string;
  minWidth?: string;
  onSearchChange: (newValue: string) => void;
  onSearchClear: () => void;
  searchFocusOnOpen?: boolean;
  searchHelpText?: string;
  searchPlaceholder?: string;
  searchValue: string;
  toggleText: string;
  toggleVariant?: React.ComponentProps<typeof MenuToggle>['variant'];
};

const SearchSelector: React.FC<SearchSelectorProps> = ({
  children,
  dataTestId,
  isLoading,
  isDisabled,
  isFullWidth,
  minWidth,
  onSearchChange,
  onSearchClear,
  searchFocusOnOpen,
  searchHelpText,
  searchPlaceholder,
  searchValue,
  toggleText,
  toggleVariant,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const toggleRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const popperProps = { minWidth, maxWidth: 'trigger' };

  return (
    <MenuContainer
      isOpen={isOpen}
      menuRef={menuRef}
      popperProps={popperProps}
      onOpenChange={(open) => {
        setIsOpen(open);
        onSearchClear();
      }}
      toggleRef={toggleRef}
      toggle={
        <MenuToggle
          id={dataTestId}
          icon={
            isLoading && (
              <Icon>
                <Spinner size="sm" aria-label="Loading" />
              </Icon>
            )
          }
          ref={toggleRef}
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={isDisabled}
          isFullWidth={isFullWidth}
          data-testid={`${dataTestId}-toggle`}
          variant={toggleVariant}
        >
          <Truncate content={toggleText} />
        </MenuToggle>
      }
      menu={
        <Menu
          data-testid={`${dataTestId}-menu`}
          ref={menuRef}
          isScrollable
          onSelect={() => setIsOpen(false)}
          onActionClick={() => setIsOpen(false)}
        >
          <MenuSearch>
            <MenuSearchInput>
              <SearchInput
                ref={searchRef}
                data-testid={`${dataTestId}-search`}
                autoFocus={searchFocusOnOpen}
                aria-label="Filter content"
                onChange={(e, value) => onSearchChange(value)}
                onClear={(e) => {
                  e.stopPropagation();
                  onSearchClear();
                }}
                placeholder={searchPlaceholder}
                value={searchValue}
              />
            </MenuSearchInput>
            {searchHelpText && (
              <HelperText>
                <HelperTextItem data-testid={`${dataTestId}-searchHelpText`}>
                  {searchHelpText}
                </HelperTextItem>
              </HelperText>
            )}
          </MenuSearch>
          <Divider />
          <MenuContent maxMenuHeight="200px">
            <MenuList data-testid={`${dataTestId}-menuList`}>
              {typeof children === 'function'
                ? children({ menuClose: () => setIsOpen(false) })
                : children}
            </MenuList>
          </MenuContent>
        </Menu>
      }
    />
  );
};

export default SearchSelector;
