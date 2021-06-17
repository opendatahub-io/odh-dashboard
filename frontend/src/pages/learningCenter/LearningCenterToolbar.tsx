import * as React from 'react';
import { useHistory } from 'react-router';
import {
  Button,
  ButtonVariant,
  SearchInput,
  Select,
  SelectOption,
  SelectVariant,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import {
  ThIcon,
  CheckIcon,
  FilterIcon,
  ListIcon,
  PficonSortCommonAscIcon,
  PficonSortCommonDescIcon,
} from '@patternfly/react-icons';
import { removeQueryArgument, setQueryArgument } from '../../utilities/router';
import { useQueryParams } from '../../utilities/useQueryParams';
import {
  SEARCH_FILTER_KEY,
  DOC_SORT_KEY,
  DOC_SORT_ORDER_KEY,
  SORT_TYPE_NAME,
  SORT_ASC,
  SORT_TYPE_TYPE,
  SORT_TYPE_APPLICATION,
  SORT_TYPE_DURATION,
  CARD_VIEW,
  LIST_VIEW,
  CATEGORY_FILTER_KEY,
  ENABLED_FILTER_KEY,
  DOC_TYPE_FILTER_KEY,
  APPLICATION_FILTER_KEY,
} from './const';

import './LearningCenterToolbar.scss';

type LearningCenterToolbarProps = {
  count: number;
  totalCount: number;
  onSearchInputChange?: (value: string) => void;
  viewType: string;
  updateViewType: (updatedType: string) => void;
  filtersCollapsible: boolean;
  onToggleFiltersCollapsed: () => void;
};

const LearningCenterToolbar: React.FC<LearningCenterToolbarProps> = ({
  count,
  totalCount,
  viewType,
  updateViewType,
  filtersCollapsible,
  onToggleFiltersCollapsed,
}) => {
  const history = useHistory();
  const [isSortTypeDropdownOpen, setIsSortTypeDropdownOpen] = React.useState(false);
  const [isSortOrderDropdownOpen, setIsSortOrderDropdownOpen] = React.useState(false);
  const queryParams = useQueryParams();
  const categoryQuery = queryParams.get(CATEGORY_FILTER_KEY) || '';
  const enabled = queryParams.get(ENABLED_FILTER_KEY);
  const docTypes = queryParams.get(DOC_TYPE_FILTER_KEY);
  const applications = queryParams.get(APPLICATION_FILTER_KEY);
  const searchQuery = queryParams.get(SEARCH_FILTER_KEY) || '';
  const [searchInputText, setSearchInputText] = React.useState(searchQuery);
  const sortType = queryParams.get(DOC_SORT_KEY) || SORT_TYPE_NAME;
  const sortOrder = queryParams.get(DOC_SORT_ORDER_KEY) || SORT_ASC;

  const sortTypes = {
    name: SORT_TYPE_NAME,
    type: SORT_TYPE_TYPE,
    application: SORT_TYPE_APPLICATION,
    duration: SORT_TYPE_DURATION,
  };
  const sortOrders = {
    ASC: 'ascending',
    DESC: 'descending',
  };

  React.useEffect(() => {
    setSearchInputText(searchQuery);
  }, [searchQuery]);

  const onSortTypeSelect = React.useCallback(
    (e) => {
      setIsSortTypeDropdownOpen(false);
      const selection = e.target.getAttribute('data-key');
      setQueryArgument(history, DOC_SORT_KEY, selection);
    },
    [history],
  );

  const sortTypeDropdownItems = Object.entries(sortTypes).map(([key, val]) => (
    <SelectOption key={key} data-key={key} value={val}>
      <CheckIcon
        className={`odh-learning-paths__toolbar__filter-check ${
          sortType === key ? 'odh-m-filtered' : ''
        }`}
        data-key={key}
      />
      {val}
    </SelectOption>
  ));
  const onSortOrderSelect = React.useCallback(
    (e) => {
      setIsSortOrderDropdownOpen(false);
      const selection = e.target.getAttribute('data-key');
      setQueryArgument(history, DOC_SORT_ORDER_KEY, selection);
    },
    [history],
  );

  const sortOrderDropdownItems = Object.entries(sortOrders).map(([key, val]) => (
    <SelectOption key={key} data-key={key} value={val}>
      <CheckIcon
        className={`odh-learning-paths__toolbar__filter-check ${
          sortOrder === key ? 'odh-m-filtered' : ''
        }`}
        data-key={key}
      />
      {key === SORT_ASC ? (
        <PficonSortCommonAscIcon data-key={key} alt={val} />
      ) : (
        <PficonSortCommonDescIcon data-key={key} alt={val} />
      )}
    </SelectOption>
  ));

  const handleTextChange = (val: string) => {
    if (val.length > 0) {
      setQueryArgument(history, SEARCH_FILTER_KEY, val);
    } else {
      removeQueryArgument(history, SEARCH_FILTER_KEY);
    }
    setSearchInputText(val);
  };

  const isFiltered = categoryQuery || enabled || docTypes || applications;

  return (
    <Toolbar className="odh-learning-paths__toolbar">
      <div className="odh-learning-paths__toolbar__view-filter">
        <span>
          {categoryQuery || 'All Items'}
          {filtersCollapsible ? (
            <Tooltip content={isFiltered ? 'Filters set' : 'No filters set'}>
              <Button
                aria-label="Toggle filters shown"
                variant={ButtonVariant.link}
                icon={<FilterIcon />}
                onClick={onToggleFiltersCollapsed}
              />
            </Tooltip>
          ) : null}
        </span>
        <ToggleGroup aria-label="View type">
          <ToggleGroupItem
            icon={<ThIcon />}
            aria-label="card view"
            buttonId="card-view"
            isSelected={viewType === CARD_VIEW}
            onChange={() => updateViewType(CARD_VIEW)}
          />
          <ToggleGroupItem
            icon={<ListIcon />}
            aria-label="listview"
            buttonId="list-view"
            isSelected={viewType === LIST_VIEW}
            onChange={() => updateViewType(LIST_VIEW)}
          />
        </ToggleGroup>
      </div>
      <ToolbarContent>
        <ToolbarItem className="odh-learning-paths__toolbar__input">
          <SearchInput
            placeholder="Search"
            value={searchInputText}
            onChange={handleTextChange}
            onClear={() => handleTextChange('')}
          />
        </ToolbarItem>
        {viewType === CARD_VIEW ? (
          <>
            <ToolbarItem>
              <Select
                variant={SelectVariant.single}
                aria-label="Select sort type"
                isOpen={isSortTypeDropdownOpen}
                onToggle={(isEnabled) => setIsSortTypeDropdownOpen(isEnabled)}
                placeholderText={`Sort by ${sortTypes[sortType]}`}
                onSelect={onSortTypeSelect}
              >
                {sortTypeDropdownItems}
              </Select>
            </ToolbarItem>
            <ToolbarItem>
              <Select
                variant={SelectVariant.single}
                aria-label="Select sort order"
                isOpen={isSortOrderDropdownOpen}
                onToggle={(isEnabled) => setIsSortOrderDropdownOpen(isEnabled)}
                placeholderText={
                  sortOrder === SORT_ASC ? (
                    <PficonSortCommonAscIcon data-key={sortOrder} alt={sortOrders.ASC} />
                  ) : (
                    <PficonSortCommonDescIcon data-key={sortOrder} alt={sortOrders.DESC} />
                  )
                }
                onSelect={onSortOrderSelect}
              >
                {sortOrderDropdownItems}
              </Select>
            </ToolbarItem>
          </>
        ) : null}
        <ToolbarItem
          className="odh-learning-paths__toolbar__count"
          alignment={{ default: 'alignRight' }}
        >
          {`${count}${count !== totalCount ? ` of ${totalCount}` : ''} items`}
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default LearningCenterToolbar;
