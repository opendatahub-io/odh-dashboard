import * as React from 'react';
import * as _ from 'lodash';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
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
import { removeQueryArgument, setQueryArgument } from '~/utilities/router';
import { useQueryParams } from '~/utilities/useQueryParams';
import { fireTrackingEvent } from '~/utilities/segmentIOUtils';
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

// add 1 second debounce to fire the search event
// to avoid firing event with every single character input
const fireSearchedEvent = _.debounce((val: string) => {
  if (val) {
    fireTrackingEvent('Resource Searched', {
      term: val,
    });
  }
}, 1000);

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

const isSortType = (e: string | null): e is keyof typeof sortTypes => !!e && e in sortTypes;
const isSortOrder = (e: string | null): e is keyof typeof sortOrders => !!e && e in sortOrders;

const LearningCenterToolbar: React.FC<LearningCenterToolbarProps> = ({
  count,
  totalCount,
  viewType,
  updateViewType,
  filtersCollapsible,
  onToggleFiltersCollapsed,
}) => {
  const navigate = useNavigate();
  const [isSortTypeDropdownOpen, setIsSortTypeDropdownOpen] = React.useState(false);
  const [isSortOrderDropdownOpen, setIsSortOrderDropdownOpen] = React.useState(false);
  const queryParams = useQueryParams();
  const categoryQuery = queryParams.get(CATEGORY_FILTER_KEY) || '';
  const enabled = queryParams.get(ENABLED_FILTER_KEY);
  const docTypes = queryParams.get(DOC_TYPE_FILTER_KEY);
  const applications = queryParams.get(APPLICATION_FILTER_KEY);
  const searchQuery = queryParams.get(SEARCH_FILTER_KEY) || '';
  const [searchInputText, setSearchInputText] = React.useState(searchQuery);
  const sortTypeQ = queryParams.get(DOC_SORT_KEY);
  const sortType = isSortType(sortTypeQ) ? sortTypeQ : SORT_TYPE_NAME;
  const sortOrderQ = queryParams.get(DOC_SORT_ORDER_KEY);
  const sortOrder = isSortOrder(sortOrderQ) ? sortOrderQ : SORT_ASC;

  React.useEffect(() => {
    setSearchInputText(searchQuery);
  }, [searchQuery]);

  React.useEffect(() => {
    fireSearchedEvent(searchInputText);
  }, [searchInputText]);

  const onSortTypeSelect = React.useCallback(
    (e: React.MouseEvent | React.ChangeEvent) => {
      setIsSortTypeDropdownOpen(false);
      const selection = (e.target as Element).getAttribute('data-key') ?? '';
      setQueryArgument(navigate, DOC_SORT_KEY, selection);
    },
    [navigate],
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
    (e: React.MouseEvent | React.ChangeEvent) => {
      setIsSortOrderDropdownOpen(false);
      const selection = (e.target as Element).getAttribute('data-key') ?? '';
      setQueryArgument(navigate, DOC_SORT_ORDER_KEY, selection);
    },
    [navigate],
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
      setQueryArgument(navigate, SEARCH_FILTER_KEY, val);
    } else {
      removeQueryArgument(navigate, SEARCH_FILTER_KEY);
    }
    setSearchInputText(val);
  };

  const isFiltered = categoryQuery || enabled || docTypes || applications;

  return (
    <Toolbar className="odh-learning-paths__toolbar">
      <div className="odh-learning-paths__toolbar__view-filter">
        <Flex spaceItems={{ default: 'spaceItemsNone' }}>
          <FlexItem>{categoryQuery || 'All Items'}</FlexItem>
          {filtersCollapsible ? (
            <FlexItem>
              <Tooltip removeFindDomNode content={isFiltered ? 'Filters set' : 'No filters set'}>
                <Button
                  aria-label="Toggle filters shown"
                  variant={ButtonVariant.link}
                  icon={<FilterIcon />}
                  onClick={onToggleFiltersCollapsed}
                />
              </Tooltip>
            </FlexItem>
          ) : null}
        </Flex>
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
            removeFindDomNode
            placeholder="Search"
            value={searchInputText}
            onChange={(_, value) => handleTextChange(value)}
            onClear={() => handleTextChange('')}
          />
        </ToolbarItem>
        {viewType === CARD_VIEW ? (
          <>
            <ToolbarItem>
              <Select
                removeFindDomNode
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
                removeFindDomNode
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
