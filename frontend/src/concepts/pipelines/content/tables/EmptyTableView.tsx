import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateActions,
  EmptyStateHeader,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';

type EmptyTableViewProps = {
  hasIcon?: boolean;
  onClearFilters: (event: React.SyntheticEvent<HTMLButtonElement, Event>) => void;
  variant?: EmptyStateVariant;
};

const EmptyTableView: React.FC<EmptyTableViewProps> = ({
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
        <EmptyStateActions>
          <Button variant="link" onClick={onClearFilters}>
            Clear all filters
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </Bullseye>
);

export default EmptyTableView;
