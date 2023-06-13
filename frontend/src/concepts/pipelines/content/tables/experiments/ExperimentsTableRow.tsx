import * as React from 'react';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import { Split, SplitItem } from '@patternfly/react-core';
import { PipelineCoreResourceKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import ExperimentsTableRowExpandedRunCells from '~/concepts/pipelines/content/tables/experiments/ExperimentsTableRowExpandedRunCells';

type ExperimentsTableRowProps = {
  expandedData: PipelineCoreResourceKF[];
  experimentName: string;
  experimentDescription: string;
  rowIndex: number;
  columnCount: number;
  onDeleteRun: (run: PipelineRunKF) => void;
};

const ExperimentsTableRow: React.FC<ExperimentsTableRowProps> = ({
  experimentName,
  experimentDescription,
  expandedData,
  columnCount,
  rowIndex,
  onDeleteRun,
}) => {
  const [isExpanded, setExpanded] = React.useState(true);

  return (
    <Tbody isExpanded={isExpanded}>
      <Tr>
        <Td
          expand={{
            rowIndex: rowIndex,
            expandId: 'experiment-row-item',
            isExpanded,
            onToggle: () => setExpanded(!isExpanded),
          }}
        />
        <Td colSpan={columnCount - 1}>
          <Split hasGutter>
            <SplitItem>{experimentName}</SplitItem>
            <SplitItem>{experimentDescription}</SplitItem>
            <SplitItem isFilled style={{ textAlign: 'right' }}>
              Create Run
            </SplitItem>
          </Split>
        </Td>
      </Tr>

      {expandedData.map((resource) => (
        <Tr key={resource.id} isExpanded={isExpanded}>
          <Td />
          <ExperimentsTableRowExpandedRunCells
            run={resource as PipelineRunKF}
            onDelete={() => onDeleteRun(resource as PipelineRunKF)}
          />
        </Tr>
      ))}
    </Tbody>
  );
};

export default ExperimentsTableRow;
