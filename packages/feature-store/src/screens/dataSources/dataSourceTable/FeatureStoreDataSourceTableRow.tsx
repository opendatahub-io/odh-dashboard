import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { Button, Content, Truncate } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { Link } from 'react-router';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { DataSource } from '../../../types/dataSources';
import { FeatureStoreRelationship } from '../../../types/global';
import { featureDataSourceRoute, featureViewRoute } from '../../../routes';
import { getDataSourceConnectorType } from '../utils';
import { getRelationshipsByTargetType } from '../../../utils/filterUtils';
import ScrollableLinksPopover from '../../../components/ScrollableLinksPopover';
import FeatureStoreTimestamp from '../../../components/FeatureStoreTimestamp';
import FeatureStoreLabels from '../../../components/FeatureStoreLabels';

type FeatureStoreDataSourcesTableRowType = {
  dataSource: DataSource;
  relationships?: Record<string, FeatureStoreRelationship[]>;
};

const DataSourceName: React.FC<{ dataSource: DataSource; currentProject: string | undefined }> = ({
  dataSource,
  currentProject,
}) => (
  <>
    <TableRowTitleDescription
      title={
        <Link
          to={
            currentProject
              ? featureDataSourceRoute(dataSource.name, currentProject)
              : featureDataSourceRoute(dataSource.name, dataSource.project || '')
          }
          data-testid="data-source-name-link"
        >
          <Truncate content={dataSource.name} style={{ textDecoration: 'underline' }} />
        </Link>
      }
      description={dataSource.description}
      truncateDescriptionLines={2}
    />
    <FeatureStoreLabels color="blue" isCompact>
      {getDataSourceConnectorType(dataSource.type)}
    </FeatureStoreLabels>
  </>
);

const renderTableCell = (label: string, content: React.ReactNode, testId: string) => (
  <Td dataLabel={label} data-testid={`${testId}-cell`}>
    {testId ? (
      <Content component="p" data-testid={testId}>
        {content}
      </Content>
    ) : (
      content
    )}
  </Td>
);

const FeatureStoreDataSourcesTableRow: React.FC<FeatureStoreDataSourcesTableRowType> = ({
  dataSource,
  relationships = {},
}) => {
  const { currentProject } = useFeatureStoreProject();
  const featureViews = React.useMemo(() => {
    const dataSourceKey = dataSource.name;
    return getRelationshipsByTargetType(relationships, dataSourceKey, 'featureView');
  }, [relationships, dataSource.name]);

  const featureViewLinks = React.useMemo(() => {
    const project = dataSource.project || currentProject;
    if (!project) {
      return [];
    }

    return featureViews.map((rel) => ({
      name: rel.target.name,
      to: featureViewRoute(rel.target.name, project),
      type: rel.target.type,
    }));
  }, [featureViews, dataSource.project, currentProject]);

  const featureViewsTrigger = (
    <Button variant="link" isInline>
      {featureViews.length} {featureViews.length === 1 ? 'feature view' : 'feature views'}
    </Button>
  );

  return (
    <Tr>
      {renderTableCell(
        'Data sources',
        <DataSourceName dataSource={dataSource} currentProject={currentProject} />,
        'data-source-name',
      )}
      {renderTableCell('Project', dataSource.project, 'data-source-project-name')}
      {renderTableCell(
        'Data source connector',
        getDataSourceConnectorType(dataSource.type),
        'data-source-connector',
      )}
      {renderTableCell(
        'Feature views',
        <ScrollableLinksPopover
          trigger={featureViewsTrigger}
          links={featureViewLinks}
          aria-label="Feature views popover"
        />,
        'data-source-feature-views',
      )}
      {renderTableCell(
        'Last modified',
        <FeatureStoreTimestamp date={dataSource.meta.lastUpdatedTimestamp} />,
        'data-source-last-modified',
      )}
      {renderTableCell(
        'Created',
        <FeatureStoreTimestamp date={dataSource.meta.createdTimestamp} />,
        'data-source-created',
      )}
      {renderTableCell('Owner', dataSource.owner ?? '-', 'data-source-owner')}
    </Tr>
  );
};

export default FeatureStoreDataSourcesTableRow;
