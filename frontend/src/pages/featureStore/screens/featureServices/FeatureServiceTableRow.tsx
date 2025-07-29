import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { Link } from 'react-router';
import { FeatureService } from '#~/pages/featureStore/types/featureServices';
import TableRowTitleDescription from '#~/components/table/TableRowTitleDescription.tsx';
import FeatureStoreTags from '#~/pages/featureStore/components/FeatureStoreTags';
import { relativeTime } from '#~/utilities/time.ts';
import { featureServiceRoute } from '#~/pages/featureStore/routes';

type FeatureServiceTableRowType = {
  featureService: FeatureService;
  fsProject?: string;
};

const FeatureServiceTableRow: React.FC<FeatureServiceTableRowType> = ({
  featureService,
  fsProject,
}) => (
  <Tr>
    <Td dataLabel="Feature service">
      <TableRowTitleDescription
        title={
          <Link
            to={featureServiceRoute(
              featureService.spec.name,
              fsProject ?? featureService.project ?? '',
            )}
          >
            {featureService.spec.name}
          </Link>
        }
        description={featureService.spec.description ?? ''}
        truncateDescriptionLines={2}
      />
    </Td>
    <Td dataLabel="Tags">
      <FeatureStoreTags tags={featureService.spec.tags ?? {}} threshold={3} />
    </Td>
    <Td dataLabel="Feature views">{featureService.spec.features?.length ?? 0}</Td>
    <Td dataLabel="Created">
      {featureService.meta.createdTimestamp ? (
        <Timestamp
          date={new Date(featureService.meta.createdTimestamp)}
          tooltip={{
            variant: TimestampTooltipVariant.default,
          }}
        >
          {relativeTime(Date.now(), new Date(featureService.meta.createdTimestamp).getTime())}
        </Timestamp>
      ) : (
        'Unknown'
      )}
    </Td>
    <Td dataLabel="Updated">
      {featureService.meta.lastUpdatedTimestamp ? (
        <Timestamp
          date={new Date(featureService.meta.lastUpdatedTimestamp)}
          tooltip={{
            variant: TimestampTooltipVariant.default,
          }}
        >
          {relativeTime(Date.now(), new Date(featureService.meta.lastUpdatedTimestamp).getTime())}
        </Timestamp>
      ) : (
        'Unknown'
      )}
    </Td>
    <Td dataLabel="Owner">{featureService.spec.owner ?? '-'}</Td>
  </Tr>
);

export default FeatureServiceTableRow;
