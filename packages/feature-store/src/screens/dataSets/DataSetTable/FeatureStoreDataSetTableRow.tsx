import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { Content, Truncate } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import * as React from 'react';
import { Link } from 'react-router-dom';
import FeatureStoreTags from '../../../components/FeatureStoreTags';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { featureDataSetRoute, featureServiceRoute } from '../../../routes';
import { DataSet } from '../../../types/dataSets';
import FeatureStoreTimestamp from '../../../components/FeatureStoreTimestamp';

type FeatureStoreDataSetsTableRowType = {
  dataSet: DataSet;
  onTagClick?: (tagString: string) => void;
};

const DataSetName: React.FC<{ dataSet: DataSet; currentProject: string | undefined }> = ({
  dataSet,
  currentProject,
}) => (
  <TableRowTitleDescription
    title={
      <Link
        to={
          currentProject
            ? featureDataSetRoute(dataSet.spec.name, currentProject)
            : featureDataSetRoute(dataSet.spec.name, dataSet.project || '')
        }
        data-testid="data-set-name-link"
      >
        <Truncate content={dataSet.spec.name} style={{ textDecoration: 'underline' }} />
      </Link>
    }
    description={dataSet.spec.description}
    truncateDescriptionLines={2}
  />
);

const renderTableCell = (label: string, content: React.ReactNode, testId?: string) => (
  <Td dataLabel={label}>
    {testId ? (
      <Content component="p" data-testid={testId}>
        {content}
      </Content>
    ) : (
      content
    )}
  </Td>
);

const FeatureStoreDataSetsTableRow: React.FC<FeatureStoreDataSetsTableRowType> = ({
  dataSet,
  onTagClick,
}) => {
  const { currentProject } = useFeatureStoreProject();

  return (
    <Tr>
      {renderTableCell('Name', <DataSetName dataSet={dataSet} currentProject={currentProject} />)}
      {renderTableCell('Project', dataSet.project, 'project-name')}
      {renderTableCell(
        'Tags',
        <FeatureStoreTags
          tags={dataSet.spec.tags ?? {}}
          showAllTags={false}
          onTagClick={onTagClick}
        />,
      )}
      {renderTableCell(
        'Source feature service',
        dataSet.spec.featureServiceName ? (
          <Link
            to={
              dataSet.project
                ? featureServiceRoute(dataSet.spec.featureServiceName, dataSet.project)
                : featureServiceRoute(dataSet.spec.featureServiceName, currentProject || '')
            }
          >
            {dataSet.spec.featureServiceName}
          </Link>
        ) : (
          '-'
        ),
        'source-feature-service',
      )}
      {renderTableCell(
        'Updated',
        dataSet.meta.lastUpdatedTimestamp ? (
          <FeatureStoreTimestamp date={dataSet.meta.lastUpdatedTimestamp} />
        ) : (
          '-'
        ),
        'updated',
      )}
      {renderTableCell(
        'Created',
        dataSet.meta.createdTimestamp ? (
          <FeatureStoreTimestamp date={dataSet.meta.createdTimestamp} />
        ) : (
          '-'
        ),
        'created',
      )}
    </Tr>
  );
};

export default FeatureStoreDataSetsTableRow;
