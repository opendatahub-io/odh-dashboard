import * as React from 'react';
import { useHistory } from 'react-router';
import * as classNames from 'classnames';
import {
  Button,
  ButtonVariant,
  SearchInput,
  Select,
  SelectOption,
  SelectVariant,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  CheckIcon,
  FilterIcon,
  PficonSortCommonAscIcon,
  PficonSortCommonDescIcon,
  TimesIcon,
} from '@patternfly/react-icons';
import { ODHDocType } from '@common/types';
import { removeQueryArgument, setQueryArgument } from '../../utilities/router';
import { useQueryParams } from '../../utilities/useQueryParams';
import {
  getTextForDocType,
  SEARCH_FILTER_KEY,
  DOC_TYPE_FILTER_KEY,
  DOC_SORT_KEY,
  DOC_SORT_ORDER_KEY,
  SORT_TYPE_NAME,
  SORT_ASC,
  SORT_TYPE_TYPE,
} from './learningCenterUtils';

import './LearningCenterFilter.scss';

type LearningCenterFilterProps = {
  count: number;
  totalCount: number;
  docTypeStatusCount: Record<ODHDocType, number>;
  onSearchInputChange?: (value: string) => void;
};

const LearningCenterFilters: React.FC<LearningCenterFilterProps> = ({
  count,
  totalCount,
  docTypeStatusCount,
}) => {
  const history = useHistory();
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = React.useState(false);
  const [isSortTypeDropdownOpen, setIsSortTypeDropdownOpen] = React.useState(false);
  const [isSortOrderDropdownOpen, setIsSortOrderDropdownOpen] = React.useState(false);
  const queryParams = useQueryParams();
  const searchQuery = queryParams.get(SEARCH_FILTER_KEY) || '';
  const filters = queryParams.get(DOC_TYPE_FILTER_KEY);
  const typeFilters = React.useMemo(() => {
    return filters?.split(',') || [];
  }, [filters]);
  const [searchInputText, setSearchInputText] = React.useState(searchQuery);
  const sortType = queryParams.get(DOC_SORT_KEY) || SORT_TYPE_NAME;
  const sortOrder = queryParams.get(DOC_SORT_ORDER_KEY) || SORT_ASC;

  const docTypes = {
    [ODHDocType.Documentation]: getTextForDocType(ODHDocType.Documentation),
    [ODHDocType.HowTo]: getTextForDocType(ODHDocType.HowTo),
    [ODHDocType.Tutorial]: getTextForDocType(ODHDocType.Tutorial),
    [ODHDocType.QuickStart]: getTextForDocType(ODHDocType.QuickStart),
  };
  const sortTypes = {
    name: SORT_TYPE_NAME,
    type: SORT_TYPE_TYPE,
  };
  const sortOrders = {
    ASC: 'ascending',
    DESC: 'descending',
  };

  const onFilterTypeSelect = React.useCallback(
    (e) => {
      setIsTypeDropdownOpen(false);
      const selection = e.target.getAttribute('data-key');
      if (typeFilters.includes(selection)) {
        return;
      }
      const selectedTypes = [...typeFilters, selection];
      setQueryArgument(history, DOC_TYPE_FILTER_KEY, selectedTypes.join(','));
    },
    [history, typeFilters],
  );

  const filterTypeDropdownItems = Object.entries(docTypes).reduce((acc, [key, val]) => {
    if (docTypeStatusCount[key] > 0) {
      acc.push(
        <SelectOption key={key} data-key={key} value={val}>
          <CheckIcon
            className={`odh-learning-paths-filter__filter-check ${
              typeFilters.includes(key) ? 'odh-m-filtered' : ''
            }`}
            data-key={key}
          />
          {val}
          <span className="odh-learning-paths-filter__filter-count" data-key={key}>
            ({docTypeStatusCount[key]})
          </span>
        </SelectOption>,
      );
    }
    return acc;
  }, [] as React.ReactElement[]);

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
        className={`odh-learning-paths-filter__filter-check ${
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
        className={`odh-learning-paths-filter__filter-check ${
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

  const removeFilter = (docType: ODHDocType): void => {
    const selectedTypes = typeFilters.filter((status) => status !== docType);
    if (selectedTypes.length > 0) {
      setQueryArgument(history, DOC_TYPE_FILTER_KEY, selectedTypes.join(','));
    } else {
      removeQueryArgument(history, DOC_TYPE_FILTER_KEY);
    }
  };

  const renderDocLabel = (docType: ODHDocType) => {
    const label = getTextForDocType(docType);
    const badgeClasses = classNames('odh-card__partner-badge odh-m-doc', {
      'odh-m-documentation': docType === ODHDocType.Documentation,
      'odh-m-tutorial': docType === ODHDocType.Tutorial,
      'odh-m-quick-start': docType === ODHDocType.QuickStart,
      'odh-m-how-to': docType === ODHDocType.HowTo,
    });

    return (
      <div className={badgeClasses} key={docType}>
        {label}
        <Button
          variant={ButtonVariant.link}
          className="odh-card__partner-badge__close"
          onClick={() => removeFilter(docType)}
        >
          <TimesIcon />
        </Button>
      </div>
    );
  };

  return (
    <Toolbar className="odh-learning-paths-filter">
      <ToolbarContent>
        <ToolbarItem className="odh-learning-paths-filter__input">
          <SearchInput
            placeholder="Search"
            value={searchInputText}
            onChange={handleTextChange}
            onClear={() => handleTextChange('')}
          />
        </ToolbarItem>
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
        <ToolbarItem>
          <Select
            variant={SelectVariant.single}
            aria-label="Select types"
            isOpen={isTypeDropdownOpen}
            onToggle={(isEnabled) => setIsTypeDropdownOpen(isEnabled)}
            placeholderText={<FilterIcon />}
            onSelect={onFilterTypeSelect}
          >
            {filterTypeDropdownItems}
          </Select>
        </ToolbarItem>
        <ToolbarItem>
          <div className="odh-learning-paths-filter__filtered-types">
            {typeFilters.map((filter) => renderDocLabel(filter as ODHDocType))}
          </div>
        </ToolbarItem>
        <ToolbarItem
          className="odh-learning-paths-filter__count"
          alignment={{ default: 'alignRight' }}
        >
          {`${count}${count !== totalCount ? ` of ${totalCount}` : ''} items`}
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default LearningCenterFilters;
