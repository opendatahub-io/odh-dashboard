import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleAction,
  MenuToggleElement,
  SearchInput,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { EllipsisVIcon, FilterIcon } from '@patternfly/react-icons';
import { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import RegisteredModelTable from './RegisteredModelTable';
import ModelRegistrySelector from './ModelRegistrySelector';

type RegisteredModelListViewProps = {
  registeredModels: RegisteredModel[];
};

const RegisteredModelListView: React.FC<RegisteredModelListViewProps> = ({
  registeredModels: unfilteredRegisteredModels,
}) => {
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.KEYWORD);
  const [search, setSearch] = React.useState('');

  const [isRegisterNewVersionOpen, setIsRegisterNewVersionOpen] = React.useState(false);
  const [isArchivedModelKebabOpen, setIsArchivedModelKebabOpen] = React.useState(false);

  const filteredRegisteredModels = unfilteredRegisteredModels.filter((rm) => {
    if (!search) {
      return true;
    }

    switch (searchType) {
      case SearchType.KEYWORD:
        return (
          rm.name.toLowerCase().includes(search.toLowerCase()) ||
          (rm.description && rm.description.toLowerCase().includes(search.toLowerCase()))
        );

      case SearchType.OWNER:
        // TODO Implement owner search functionality once RHOAIENG-5066 is completed.
        return;

      default:
        return true;
    }
  });

  const resetFilters = () => {
    setSearch('');
  };

  const searchTypes = React.useMemo(() => [SearchType.KEYWORD], []); // TODO Add owner once RHOAIENG-5066 is completed.

  const tooltipRef = React.useRef<HTMLButtonElement>(null);

  const toggleGroupItems = (
    <ToolbarGroup variant="filter-group">
      <ToolbarFilter
        chips={search === '' ? [] : [search]}
        deleteChip={() => setSearch('')}
        deleteChipGroup={() => setSearch('')}
        categoryName="Keyword"
      >
        <SimpleDropdownSelect
          options={searchTypes.map((key) => ({
            key,
            label: key,
          }))}
          value={searchType}
          onChange={(newSearchType) => {
            setSearchType(newSearchType as SearchType);
          }}
          icon={<FilterIcon />}
        />
      </ToolbarFilter>
      <ToolbarItem variant="search-filter">
        <SearchInput
          placeholder={`Find by ${searchType.toLowerCase()}`}
          value={search}
          onChange={(_, searchValue) => {
            setSearch(searchValue);
          }}
          onClear={() => setSearch('')}
          style={{ minWidth: '200px' }}
        />
      </ToolbarItem>
    </ToolbarGroup>
  );

  return (
    <RegisteredModelTable
      clearFilters={resetFilters}
      registeredModels={filteredRegisteredModels}
      toolbarContent={
        <>
          <ToolbarItem>
            <ModelRegistrySelector />
          </ToolbarItem>
          <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
            {toggleGroupItems}
          </ToolbarToggleGroup>
          <ToolbarItem>
            <Dropdown
              isOpen={isRegisterNewVersionOpen}
              onSelect={() => setIsRegisterNewVersionOpen(false)}
              onOpenChange={(isOpen) => setIsRegisterNewVersionOpen(isOpen)}
              toggle={(toggleRef) => (
                <MenuToggle
                  isFullWidth
                  variant="primary"
                  ref={toggleRef}
                  onClick={() => setIsRegisterNewVersionOpen(!isRegisterNewVersionOpen)}
                  isExpanded={isRegisterNewVersionOpen}
                  splitButtonOptions={{
                    variant: 'action',
                    items: [
                      <MenuToggleAction
                        id="register-model-button"
                        key="register-model-button"
                        data-testid="register-model-button"
                        aria-label="Register model"
                        onClick={() => undefined}
                      >
                        Register model
                      </MenuToggleAction>,
                    ],
                  }}
                  aria-label="Register model toggle"
                  data-testid="register-model-split-button"
                />
              )}
            >
              <DropdownList>
                <DropdownItem
                  id="register-new-version-button"
                  key="register-new-version-button"
                  onClick={() => undefined}
                  ref={tooltipRef}
                  isDisabled // This feature is currently disabled but will be enabled in a future PR post-summit release.
                >
                  Register new version
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
          <ToolbarItem>
            <Dropdown
              isOpen={isArchivedModelKebabOpen}
              onSelect={() => setIsArchivedModelKebabOpen(false)}
              onOpenChange={(isOpen: boolean) => setIsArchivedModelKebabOpen(isOpen)}
              toggle={(tr: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={tr}
                  variant="plain"
                  onClick={() => setIsArchivedModelKebabOpen(!isArchivedModelKebabOpen)}
                  isExpanded={isArchivedModelKebabOpen}
                >
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <DropdownList>
                <DropdownItem isDisabled>View archived models</DropdownItem>
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
        </>
      }
    />
  );
};

export default RegisteredModelListView;
