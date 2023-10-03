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
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';

type EmptyTableViewProps = {
  onClearFilters: () => void;
};

const EmptyTableView: React.FC<EmptyTableViewProps> = ({ onClearFilters }) => (
  <Bullseye>
    <EmptyState>
      <EmptyStateHeader
        titleText="No results found"
        icon={<EmptyStateIcon icon={SearchIcon} />}
        headingLevel="h2"
      />
      <EmptyStateBody>
        No results match the filter criteria. Clear all filters and try again.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button variant="link" onClick={() => onClearFilters()}>
            Clear all filters
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </Bullseye>
);

export default EmptyTableView;
