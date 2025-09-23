import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Button } from '@patternfly/react-core';
import { Link } from 'react-router';
import { CheckCircleIcon } from '@patternfly/react-icons';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { getRelationshipsByTargetType, Relationship } from './utils';
import { FeatureView } from '../../types/featureView';
import FeatureStoreTags from '../../components/FeatureStoreTags';
import FeatureStoreLabels from '../../components/FeatureStoreLabels';
import { featureViewRoute, featureServiceRoute } from '../../routes';
import { featureRoute } from '../../FeatureStoreRoutes';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import FeatureStoreTimestamp from '../../components/FeatureStoreTimestamp';
import ScrollableLinksPopover from '../../components/ScrollableLinksPopover';

type FeatureViewTableRowType = {
  featureView: FeatureView;
  fsProject?: string;
  relationships: Record<string, Relationship[]>;
  onTagClick: (tag: string) => void;
  visibleColumns: SortableData<FeatureView>[];
};

const getFeatureViewType = (type: FeatureView['type']) => {
  switch (type) {
    case 'featureView':
      return 'Batch';
    case 'onDemandFeatureView':
      return 'On demand';
    case 'streamFeatureView':
      return 'Stream';
  }
};

const FeatureViewTableRow: React.FC<FeatureViewTableRowType> = ({
  featureView,
  fsProject,
  relationships,
  onTagClick,
  visibleColumns,
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

  const featureServices = React.useMemo(() => {
    const featureKey = featureView.spec.name;
    return getRelationshipsByTargetType<Relationship>(
      relationships,
      featureKey,
      'featureService',
      'target',
    );
  }, [relationships, featureView.spec.name]);

  const featureServiceLinks = React.useMemo(() => {
    const project = featureView.project || fsProject;

    if (!project) {
      return [];
    }

    return featureServices.map((rel) => ({
      name: rel.target.name,
      to: featureServiceRoute(rel.target.name, project),
      type: 'featureService',
    }));
  }, [featureServices, featureView.project, fsProject]);

  const featuresTrigger = (
    <Button variant="link" isInline>
      {features.length} {features.length === 1 ? 'feature' : 'features'}
    </Button>
  );

  const featureServicesTrigger = (
    <Button variant="link" isInline>
      {featureServices.length} {featureServices.length === 1 ? 'service' : 'services'}
    </Button>
  );

  const renderCell = (column: SortableData<FeatureView>) => {
    switch (column.field) {
      case 'feature_view':
        return (
          <Td key="feature_view" dataLabel="Feature View">
            <TableRowTitleDescription
              title={
                <Link
                  to={featureViewRoute(
                    featureView.spec.name,
                    fsProject ?? featureView.project ?? '',
                  )}
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
        );
      case 'project':
        return (
          <Td key="project" dataLabel="Project">
            {featureView.project ? featureView.project : currentProject}
          </Td>
        );
      case 'tags':
        return (
          <Td key="tags" dataLabel="Tags">
            <FeatureStoreTags
              tags={featureView.spec.tags ?? {}}
              threshold={3}
              onTagClick={onTagClick}
            />
          </Td>
        );
      case 'features':
        return (
          <Td key="features" dataLabel="Features">
            <ScrollableLinksPopover
              trigger={featuresTrigger}
              links={featureLinks}
              aria-label="Feature views popover"
            />
          </Td>
        );
      case 'feature_services':
        return (
          <Td key="feature_services" dataLabel="Feature Services">
            <ScrollableLinksPopover
              trigger={featureServicesTrigger}
              links={featureServiceLinks}
              aria-label="Feature services popover"
            />
          </Td>
        );
      case 'created':
        return (
          <Td key="created" dataLabel="Created">
            <FeatureStoreTimestamp
              date={new Date(featureView.meta.createdTimestamp)}
              fallback="Unknown"
            />
          </Td>
        );
      case 'updated':
        return (
          <Td key="updated" dataLabel="Updated">
            <FeatureStoreTimestamp
              date={new Date(featureView.meta.lastUpdatedTimestamp)}
              fallback="Unknown"
            />
          </Td>
        );
      case 'owner':
        return (
          <Td key="owner" dataLabel="Owner">
            {featureView.spec.owner ?? '-'}
          </Td>
        );
      case 'store_type':
        return (
          <Td key="store_type" dataLabel="Store type">
            {'offline' in featureView.spec && featureView.spec.offline && (
              <FeatureStoreLabels color="red" variant="outline" icon={<CheckCircleIcon />}>
                Offline
              </FeatureStoreLabels>
            )}
            {'online' in featureView.spec && featureView.spec.online && (
              <FeatureStoreLabels color="green" variant="outline" icon={<CheckCircleIcon />}>
                Online
              </FeatureStoreLabels>
            )}
            {(!('offline' in featureView.spec) || !featureView.spec.offline) &&
              (!('online' in featureView.spec) || !featureView.spec.online) &&
              '-'}
          </Td>
        );
      default:
        return null;
    }
  };

  return <Tr>{visibleColumns.map((column) => renderCell(column))}</Tr>;
};

export default FeatureViewTableRow;
