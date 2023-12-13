import React from 'react';
import { ActionsColumn, ExpandableRowContent, TableText, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { EdgeModel } from '~/concepts/edge/types';
import { Table } from '~/components/table';
import { EdgeStatus } from '~/concepts/edge/content/pipelines/table/EdgeStatus';
import { edgeModelVersionsColumns, edgeModelsColumns } from './const';
import EdgeModeVersionRow from './EdgeModeVersionRow';

type EdgeModelRowProps = {
  // an array of edge models that use the same pipeline
  model: EdgeModel;
  onEdit: () => void;
  onRerun: () => void;
  rowIndex: number;
};

const EdgeModelRow: React.FC<EdgeModelRowProps> = ({ model, onEdit, onRerun, rowIndex }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // get runs from all models
  const sortedVersions = React.useMemo(
    () => Object.values(model.versions).sort((a, b) => parseInt(b.version) - parseInt(a.version)),
    [model],
  );

  const latestVersion = sortedVersions[0];

  return (
    <>
      <Tr>
        <Td
          expand={
            sortedVersions.length > 0
              ? {
                  rowIndex,
                  isExpanded: isExpanded,
                  onToggle: () => setIsExpanded(!isExpanded),
                  expandId: 'composable-expandable-versions',
                }
              : undefined
          }
        />
        <Td dataLabel="Name">{model.params.modelName}</Td>

        <Td dataLabel="Last run status">
          <EdgeStatus status={model.latestRun.status} run={model.latestRun.run} />
        </Td>
        <Td dataLabel="Latest model container">
          {model.latestRun.status?.status === 'True' ||
          model.latestRun.status?.status === 'False' ? (
            `${latestVersion.modelName}:${latestVersion.version}`
          ) : (
            <TableText>
              <Link to={`/edgePipelines/pipelineRun/view/${model.latestRun.run.metadata.name}`}>
                Building image...
              </Link>
            </TableText>
          )}
        </Td>
        <Td dataLabel="Versions">{sortedVersions.length}</Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                title: 'Edit',
                onClick: () => onEdit(),
              },
              {
                title: 'Rerun image build pipeline',
                onClick: () => onRerun(),
              },
            ]}
          />
        </Td>
      </Tr>
      {isExpanded && (
        <Tr isExpanded={isExpanded}>
          <Td />
          <Td colSpan={edgeModelsColumns.length}>
            <ExpandableRowContent>
              <Table
                data={sortedVersions}
                columns={edgeModelVersionsColumns}
                rowRenderer={(version) => (
                  <EdgeModeVersionRow key={version.version} version={version} />
                )}
              />
            </ExpandableRowContent>
          </Td>
        </Tr>
      )}
    </>
  );
};

export default EdgeModelRow;
