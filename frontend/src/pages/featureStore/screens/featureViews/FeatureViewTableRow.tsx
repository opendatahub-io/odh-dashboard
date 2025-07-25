import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { Link } from 'react-router';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { FeatureView } from '#~/pages/featureStore/types/featureView';
import TableRowTitleDescription from '#~/components/table/TableRowTitleDescription.tsx';
import FeatureStoreTags from '#~/pages/featureStore/components/FeatureStoreTags';
import FeatureStoreLabels from '#~/pages/featureStore/components/FeatureStoreLabels';
import { relativeTime } from '#~/utilities/time.ts';
import { featureViewRoute } from '#~/pages/featureStore/routes';

type FeatureViewTableRowType = {
  featureView: FeatureView;
  fsProject?: string;
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

const FeatureViewTableRow: React.FC<FeatureViewTableRowType> = ({ featureView, fsProject }) => (
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
    <Td dataLabel="Tags">
      <FeatureStoreTags tags={featureView.spec.tags ?? {}} threshold={3} />
    </Td>
    <Td dataLabel="Features">{featureView.spec.features.length}</Td>
    <Td dataLabel="Created">
      {featureView.meta.createdTimestamp ? (
        <Timestamp
          date={new Date(featureView.meta.createdTimestamp)}
          tooltip={{
            variant: TimestampTooltipVariant.default,
          }}
        >
          {relativeTime(Date.now(), new Date(featureView.meta.createdTimestamp).getTime())}
        </Timestamp>
      ) : (
        'Unknown'
      )}
    </Td>
    <Td dataLabel="Updated">
      {featureView.meta.lastUpdatedTimestamp ? (
        <Timestamp
          date={new Date(featureView.meta.lastUpdatedTimestamp)}
          tooltip={{
            variant: TimestampTooltipVariant.default,
          }}
        >
          {relativeTime(Date.now(), new Date(featureView.meta.lastUpdatedTimestamp).getTime())}
        </Timestamp>
      ) : (
        'Unknown'
      )}
    </Td>
    <Td dataLabel="Owner">{featureView.spec.owner ?? '-'}</Td>
    <Td dataLabel="Store type">
      {featureView.spec.offline && (
        <FeatureStoreLabels color="green" variant="outline" icon={<CheckCircleIcon />}>
          Offline
        </FeatureStoreLabels>
      )}
      {featureView.spec.online && (
        <FeatureStoreLabels color="red" variant="outline" icon={<CheckCircleIcon />}>
          Online
        </FeatureStoreLabels>
      )}
    </Td>
  </Tr>
);

export default FeatureViewTableRow;
