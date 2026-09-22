import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';

type DashboardEmptyTableViewProps = {
  hasIcon?: boolean;
  onClearFilters: (event: React.SyntheticEvent<HTMLButtonElement, Event>) => void;
  titleText?: string;
  bodyText?: string;
  variant?: EmptyStateVariant;
  showClearFilters?: boolean;
  clearFiltersText?: string;
};

const DashboardEmptyTableView: React.FC<DashboardEmptyTableViewProps> = ({
  onClearFilters,
  hasIcon = true,
  titleText = 'No results found',
  bodyText = 'Adjust your filters and try again.',
  variant,
  showClearFilters = true,
  clearFiltersText = 'Clear all filters',
}) => (
  <Bullseye>
    <EmptyState
      headingLevel="h2"
      titleText={titleText}
      variant={variant}
      data-testid="dashboard-empty-table-state"
      icon={hasIcon ? SearchIcon : undefined}
    >
      <EmptyStateBody>{bodyText}</EmptyStateBody>
      {showClearFilters && (
        <EmptyStateFooter>
          <Button variant="link" onClick={onClearFilters} data-testid="clear-filters-button">
            {clearFiltersText}
          </Button>
        </EmptyStateFooter>
      )}
    </EmptyState>
  </Bullseye>
);

export default DashboardEmptyTableView;
