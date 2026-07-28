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
};

const DashboardEmptyTableView: React.FC<DashboardEmptyTableViewProps> = ({
  onClearFilters,
  hasIcon = true,
  titleText = 'No results found',
  bodyText = 'Adjust your filters and try again.',
  variant,
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
      <EmptyStateFooter>
        <Button variant="link" onClick={onClearFilters} data-testid="clear-filters-button">
          Clear all filters
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  </Bullseye>
);

export default DashboardEmptyTableView;
