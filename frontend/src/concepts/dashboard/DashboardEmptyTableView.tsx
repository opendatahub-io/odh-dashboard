import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';

type DashboardEmptyTableViewProps = {
  hasIcon?: boolean;
  onClearFilters: (event: React.SyntheticEvent<HTMLButtonElement, Event>) => void;
  variant?: EmptyStateVariant;
};

const DashboardEmptyTableView: React.FC<DashboardEmptyTableViewProps> = ({
  onClearFilters,
  hasIcon = true,
  variant,
}) => (
  <Bullseye>
    <EmptyState variant={variant}>
      <EmptyStateHeader
        titleText="No results found"
        headingLevel="h2"
        {...(hasIcon && { icon: <EmptyStateIcon icon={SearchIcon} /> })}
      />
      <EmptyStateBody>
        No results match the filter criteria. Clear all filters and try again.
      </EmptyStateBody>
      <EmptyStateFooter>
        <Button variant="link" onClick={onClearFilters}>
          Clear all filters
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  </Bullseye>
);

export default DashboardEmptyTableView;
