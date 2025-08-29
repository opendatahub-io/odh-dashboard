import Table from '@odh-dashboard/internal/components/table/Table';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import {
  Bullseye,
  capitalize,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import React from 'react';
import { Link } from 'react-router-dom';
import { recentlyVisitedResourcesColumns, EMPTY_STATE_MESSAGES } from './const';
import { formatResourceType, getResourceRoute } from './utils';
import useRecentlyVisitedResources from '../../apiHooks/useRecentlyVisitedResources';
import { RecentlyVisitedResource } from '../../types/metrics';

type RecentlyVisitedResourcesProps = {
  project?: string;
  limit?: number;
};

const RecentlyVisitedResourcesTableRow: React.FC<{
  item: RecentlyVisitedResource;
}> = ({ item }) => {
  const resourceType = formatResourceType(item.object);
  const resourceLink = getResourceRoute(resourceType, item.object_name, item.project);
  return (
    <Tr>
      <Td dataLabel="Resource name">
        <Link
          to={resourceLink}
          aria-label={`Go to ${item.object_name} ${resourceType} in ${item.project} project`}
        >
          {item.object_name}
        </Link>
      </Td>
      <Td dataLabel="Resource type">{capitalize(resourceType)}</Td>
      <Td dataLabel="Last viewed">
        {relativeTime(Date.now(), new Date(item.timestamp).getTime())}
      </Td>
    </Tr>
  );
};

const RecentlyVisitedResources: React.FC<RecentlyVisitedResourcesProps> = ({
  project,
  limit = 0,
}) => {
  const { data, loaded, error } = useRecentlyVisitedResources({ project, limit });

  const emptyTableView = (
    <EmptyState
      headingLevel="h6"
      icon={PlusIcon}
      titleText={EMPTY_STATE_MESSAGES.RECENTLY_VISITED_RESOURCES}
      variant={EmptyStateVariant.lg}
      data-testid="recently-visited-resources-empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        {EMPTY_STATE_MESSAGES.RECENTLY_VISITED_RESOURCES}
      </EmptyStateBody>
    </EmptyState>
  );

  const renderContent = () => {
    if (!loaded) {
      return (
        <Bullseye>
          <Spinner />
        </Bullseye>
      );
    }

    if (error) {
      return <Content>Error loading recently visited resources</Content>;
    }

    if (data.visits.length === 0) {
      return emptyTableView;
    }

    return (
      <Table
        defaultSortColumn={2}
        loading={!loaded}
        data-testid="recently-visited-resources-table"
        id="recently-visited-resources-table"
        enablePagination
        data={data.visits}
        columns={recentlyVisitedResourcesColumns}
        rowRenderer={(item, index) => (
          <RecentlyVisitedResourcesTableRow key={`${item.object_name}-${index}`} item={item} />
        )}
        variant="compact"
      />
    );
  };

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
      <Title headingLevel="h3" data-testid="recently-visited-resources-title">
        Recently viewed resources
      </Title>
      {renderContent()}
    </Flex>
  );
};

export default RecentlyVisitedResources;
