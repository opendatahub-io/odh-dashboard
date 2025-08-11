import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Button } from '@patternfly/react-core';
import { Link } from 'react-router';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { FeatureView } from '#~/pages/featureStore/types/featureView';
import TableRowTitleDescription from '#~/components/table/TableRowTitleDescription.tsx';
import FeatureStoreTags from '#~/pages/featureStore/components/FeatureStoreTags';
import FeatureStoreLabels from '#~/pages/featureStore/components/FeatureStoreLabels';
import { featureViewRoute } from '#~/pages/featureStore/routes';
import { featureRoute } from '#~/pages/featureStore/FeatureStoreRoutes';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import {
  getRelationshipsByTargetType,
  Relationship,
} from '#~/pages/featureStore/screens/featureViews/utils';
import FeatureStoreTimestamp from '#~/pages/featureStore/components/FeatureStoreTimestamp';
import ScrollableLinksPopover from '#~/pages/featureStore/components/ScrollableLinksPopover';

type FeatureViewTableRowType = {
  featureView: FeatureView;
  fsProject?: string;
  relationships: Record<string, Relationship[]>;
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
        <FeatureStoreTags tags={featureView.spec.tags ?? {}} threshold={3} />
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
