import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { Features } from '../../types/features';
import { featureRoute } from '../../FeatureStoreRoutes';
import { featureViewRoute } from '../../routes';

type FeatureTableRowType = {
  features: Features;
  fsProject?: string;
};

const FeatureTableRow: React.FC<FeatureTableRowType> = ({ features, fsProject }) => (
  <Tr>
    <Td dataLabel="Feature">
      <TableRowTitleDescription
        title={
          <Link
            to={featureRoute(
              features.name,
              features.featureView,
              fsProject ?? features.project ?? '',
            )}
          >
            {features.name}
          </Link>
        }
        description={features.description ?? ''}
        truncateDescriptionLines={2}
      />
    </Td>
    <Td dataLabel="Project">{features.project ?? '-'}</Td>
    <Td dataLabel="Value type">{features.type ?? '-'}</Td>
    <Td dataLabel="Feature view">
      <Link to={featureViewRoute(features.featureView, fsProject ?? features.project ?? '')}>
        {features.featureView}
      </Link>
    </Td>
    <Td dataLabel="Owner">{features.owner ?? '-'}</Td>
  </Tr>
);

export default FeatureTableRow;
