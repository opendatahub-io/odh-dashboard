import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Button } from '@patternfly/react-core';
import { Link } from 'react-router';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { FeatureView } from '../../types/featureView';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import FeatureStoreTags from '../../components/FeatureStoreTags';
import FeatureStoreLabels from '../../components/FeatureStoreLabels';
import { featureViewRoute } from '../../routes';
import { featureRoute } from '../../FeatureStoreRoutes';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import {
  getRelationshipsByTargetType,
  Relationship,
} from './utils';
import FeatureStoreTimestamp from '../../components/FeatureStoreTimestamp';
import ScrollableLinksPopover from '../../components/ScrollableLinksPopover';

type FeatureViewTableRowType = {
  featureView: FeatureView;
  fsProject?: string;
  relationships: Record<string, Relationship[]>;
  onTagClick: (tag: string) => void;
};

const getFeatureViewType = (type: FeatureView['type']) => {
  switch (type) {
    case 'featureView':
      return 'Batch';
    case 'onDemandFeatureView':
      return 'On demand';
    // TODO: Add stream feature view type once available from backend
  }
};

const FeatureViewTableRow: React.FC<FeatureViewTableRowType> = ({
  featureView,
  fsProject,
  relationships,
  onTagClick,
}) => {
  const { currentProject } = useFeatureStoreProject();
  const features = React.useMemo(() => {
    const featureKey = featureView.spec.name;
    return getRelationshipsByTargetType<Relationship>(
      relationships,
      featureKey,
      'feature',
      'source',
    );
  }, [relationships, featureView.spec.name]);

  const featureLinks = React.useMemo(() => {
    const project = featureView.project || fsProject;

    if (!project) {
      return [];
    }

    return features.map((rel) => ({
      name: rel.source.name,
      to: featureRoute(rel.source.name, rel.target.name, project),
      type: rel.source.type,
    }));
  }, [features, featureView.project, fsProject]);

  const featuresTrigger = (
    <Button variant="link" isInline>
      {features.length} {features.length === 1 ? 'feature' : 'features'}
    </Button>
  );

  return (
    <Tr>
      <Td dataLabel="Feature View">
        <TableRowTitleDescription
          title={
            <Link
              to={featureViewRoute(featureView.spec.name, fsProject ?? featureView.project ?? '')}
            >
              {featureView.spec.name}
            </Link>
          }
          description={featureView.spec.description ?? ''}
          truncateDescriptionLines={2}
        />

        <FeatureStoreLabels color="blue" isCompact>
          {getFeatureViewType(featureView.type)}
        </FeatureStoreLabels>
      </Td>
      <Td dataLabel="Project">{featureView.project ? featureView.project : currentProject}</Td>
      <Td dataLabel="Tags">
        <FeatureStoreTags
          tags={featureView.spec.tags ?? {}}
          threshold={3}
          onTagClick={onTagClick}
        />
      </Td>
      <Td dataLabel="Features">
        <ScrollableLinksPopover
          trigger={featuresTrigger}
          links={featureLinks}
          aria-label="Feature views popover"
        />
      </Td>
      <Td dataLabel="Created">
        <FeatureStoreTimestamp
          date={new Date(featureView.meta.createdTimestamp)}
          fallback="Unknown"
        />
      </Td>
      <Td dataLabel="Updated">
        <FeatureStoreTimestamp
          date={new Date(featureView.meta.lastUpdatedTimestamp)}
          fallback="Unknown"
        />
      </Td>
      <Td dataLabel="Owner">{featureView.spec.owner ?? '-'}</Td>
      <Td dataLabel="Store type">
        {featureView.spec.offline && (
          <FeatureStoreLabels color="red" variant="outline" icon={<CheckCircleIcon />}>
            Offline
          </FeatureStoreLabels>
        )}
        {featureView.spec.online && (
          <FeatureStoreLabels color="green" variant="outline" icon={<CheckCircleIcon />}>
            Online
          </FeatureStoreLabels>
        )}
        {!featureView.spec.offline && !featureView.spec.online && '-'}
      </Td>
    </Tr>
  );
};

export default FeatureViewTableRow;
