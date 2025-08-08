import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import TableRowTitleDescription from '#~/components/table/TableRowTitleDescription.tsx';
import { Features } from '#~/pages/featureStore/types/features';
import { featureRoute } from '#~/pages/featureStore/FeatureStoreRoutes';
import { featureViewRoute } from '#~/pages/featureStore/routes';

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
    <Td dataLabel="Value Type">{features.type ?? '-'}</Td>
    <Td dataLabel="Feature View">
      <Link to={featureViewRoute(features.featureView, fsProject ?? features.project ?? '')}>
        {features.featureView}
      </Link>
    </Td>
    <Td dataLabel="Owner">{features.owner ?? '-'}</Td>
  </Tr>
);

export default FeatureTableRow;
