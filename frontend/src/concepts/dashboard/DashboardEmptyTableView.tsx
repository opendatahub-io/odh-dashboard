import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStatePrimary,
  Title,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';

type DashboardEmptyTableViewProps = {
  onClearFilters: () => void;
};

const DashboardEmptyTableView: React.FC<DashboardEmptyTableViewProps> = ({ onClearFilters }) => (
  <Bullseye>
    <EmptyState>
      <EmptyStateIcon icon={SearchIcon} />
      <Title size="lg" headingLevel="h2">
        No results found
      </Title>
      <EmptyStateBody>
        No results match the filter criteria. Clear all filters and try again.
      </EmptyStateBody>
      <EmptyStatePrimary>
        <Button variant="link" onClick={() => onClearFilters()}>
          Clear all filters
        </Button>
      </EmptyStatePrimary>
    </EmptyState>
  </Bullseye>
);

export default DashboardEmptyTableView;
