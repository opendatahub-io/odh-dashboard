import * as React from 'react';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';

type AgentDeploymentsEmptyTableViewProps = {
  onClearFilters: (event: React.SyntheticEvent<HTMLButtonElement, Event>) => void;
};

const AgentDeploymentsEmptyTableView: React.FC<AgentDeploymentsEmptyTableViewProps> = ({
  onClearFilters,
}) => (
  <Bullseye>
    <EmptyState
      headingLevel="h2"
      titleText="No agent deployments found"
      data-testid="dashboard-empty-table-state"
      icon={SearchIcon}
    >
      <EmptyStateBody>
        Adjust your search or clear filters to see more agent deployments.
      </EmptyStateBody>
      <EmptyStateFooter>
        <Button variant="link" onClick={onClearFilters} data-testid="clear-filters-button">
          Clear all filters
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  </Bullseye>
);

export default AgentDeploymentsEmptyTableView;
