import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { Link } from 'react-router';
import { FeatureService } from '#~/pages/featureStore/types/featureServices';
import TableRowTitleDescription from '#~/components/table/TableRowTitleDescription.tsx';
import FeatureStoreTags from '#~/pages/featureStore/components/FeatureStoreTags';
import { relativeTime } from '#~/utilities/time.ts';
import { featureServiceRoute, featureViewRoute } from '#~/pages/featureStore/routes';
import ScrollableLinksPopover from '../../components/ScrollableLinksPopover';
import FeatureStoreTimestamp from '../../components/FeatureStoreTimestamp';

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
    <Td dataLabel="Feature views">
      <ScrollableLinksPopover
        trigger={<span>{featureService.spec.features?.length ?? 0}</span>}
        links={
          featureService.spec.features?.map((feature) => ({
            name: feature.featureViewName,
            to: featureViewRoute(
              feature.featureViewName,
              fsProject ?? featureService.project ?? '',
            ),
          })) ?? []
        }
      />
    </Td>
    <Td dataLabel="Created">
      <FeatureStoreTimestamp date={featureService.meta.createdTimestamp} />
    </Td>
    <Td dataLabel="Updated">
      <FeatureStoreTimestamp date={featureService.meta.lastUpdatedTimestamp} />
    </Td>
    <Td dataLabel="Owner">{featureService.spec.owner ?? '-'}</Td>
    {!fsProject && <Td dataLabel="Project">{featureService.project}</Td>}
  </Tr>
);

export default FeatureServiceTableRow;
