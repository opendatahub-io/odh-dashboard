import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { FeatureService } from '../../types/featureServices';
import FeatureStoreTags from '../../components/FeatureStoreTags';
import { featureServiceRoute, featureViewRoute } from '../../routes';
import FeatureStoreTimestamp from '../../components/FeatureStoreTimestamp';
import ScrollableLinksPopover from '../../components/ScrollableLinksPopover';

type FeatureServiceTableRowType = {
  featureService: FeatureService;
  fsProject?: string;
  onTagClick: (tag: string) => void;
};

const FeatureServiceTableRow: React.FC<FeatureServiceTableRowType> = ({
  featureService,
  fsProject,
  onTagClick,
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
    <Td dataLabel="Project">{fsProject ?? featureService.project}</Td>
    <Td dataLabel="Tags">
      <FeatureStoreTags
        tags={featureService.spec.tags ?? {}}
        threshold={3}
        onTagClick={onTagClick}
      />
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
  </Tr>
);

export default FeatureServiceTableRow;
