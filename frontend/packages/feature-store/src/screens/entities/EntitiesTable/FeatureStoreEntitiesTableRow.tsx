import { Td, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { Content, Truncate, Button } from '@patternfly/react-core';
import { Link } from 'react-router';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { Entity } from '../../../types/entities';
import FeatureStoreTags from '../../../components/FeatureStoreTags';
import ScrollableLinksPopover from '../../../components/ScrollableLinksPopover';
import FeatureStoreTimestamp from '../../../components/FeatureStoreTimestamp';
import { featureViewRoute, featureEntityRoute } from '../../../routes';
import { FeatureStoreRelationship } from '../../../types/global';
import { getRelationshipsByTargetType } from '../../../utils/filterUtils';

type FeatureStoreEntitiesTableRowType = {
  entity: Entity;
  relationships?: Record<string, FeatureStoreRelationship[]>;
};

const EntityName: React.FC<{ entity: Entity; currentProject: string | undefined }> = ({
  entity,
  currentProject,
}) => (
  <TableRowTitleDescription
    title={
      <Link
        to={
          currentProject
            ? featureEntityRoute(entity.spec.name, currentProject)
            : featureEntityRoute(entity.spec.name, entity.project || '')
        }
        data-testid="entity-name-link"
      >
        <Truncate content={entity.spec.name} style={{ textDecoration: 'underline' }} />
      </Link>
    }
    description={entity.spec.description}
    truncateDescriptionLines={2}
  />
);

const renderTableCell = (label: string, content: React.ReactNode, testId?: string) => (
  <Td dataLabel={label}>
    {testId ? (
      <Content component="p" data-testid={testId}>
        {content}
      </Content>
    ) : (
      content
    )}
  </Td>
);

const FeatureStoreEntitiesTableRow: React.FC<FeatureStoreEntitiesTableRowType> = ({
  entity,
  relationships = {},
}) => {
  const { currentProject } = useFeatureStoreProject();
  const featureViews = React.useMemo(() => {
    const entityKey = entity.spec.name;
    return getRelationshipsByTargetType(relationships, entityKey, 'featureView');
  }, [relationships, entity.spec.name]);

  const featureViewLinks = React.useMemo(() => {
    const project = entity.project || currentProject;
    if (!project) {
      return [];
    }

    return featureViews.map((rel) => ({
      name: rel.target.name,
      to: featureViewRoute(rel.target.name, project),
      type: rel.target.type,
    }));
  }, [featureViews, entity.project, currentProject]);

  const featureViewsTrigger = (
    <Button variant="link" isInline>
      {featureViews.length} {featureViews.length === 1 ? 'feature view' : 'feature views'}
    </Button>
  );

  return (
    <Tr>
      {renderTableCell('Entities', <EntityName entity={entity} currentProject={currentProject} />)}
      {renderTableCell('Project', entity.project, 'project-name')}
      {renderTableCell(
        'Tags',
        <FeatureStoreTags tags={entity.spec.tags ?? {}} showAllTags={false} />,
      )}
      {renderTableCell('Join key', entity.spec.joinKey ?? '-', 'join-key')}
      {renderTableCell(
        'Value type',
        entity.spec.valueType ?? '-',
        `value-type-${entity.spec.name}`,
      )}
      {renderTableCell(
        'Feature Views',
        <ScrollableLinksPopover
          trigger={featureViewsTrigger}
          links={featureViewLinks}
          aria-label="Feature views popover"
        />,
      )}
      {renderTableCell(
        'Created',
        <FeatureStoreTimestamp date={entity.meta.createdTimestamp} />,
        'created',
      )}
      {renderTableCell(
        'Updated',
        <FeatureStoreTimestamp date={entity.meta.lastUpdatedTimestamp} />,
        'updated',
      )}
      {renderTableCell('Owner', entity.spec.owner ?? '-', 'owner')}
    </Tr>
  );
};

export default FeatureStoreEntitiesTableRow;
