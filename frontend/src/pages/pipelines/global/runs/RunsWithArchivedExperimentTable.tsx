import * as React from 'react';
import { Table, TableText, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Content, Stack, StackItem } from '@patternfly/react-core';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import { ExperimentKF, PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { getGroupRunsByExperiment } from './utils';
import RestoreRunsTableRowExperiment from './RestoreRunsTableRowExperiment';
import { RestoreRunsStatusIcon } from './RestoreRunsStatusIcon';
import { StatusEntry } from './types';

type RunsWithArchivedExperimentProps = {
  runs: PipelineRunKF[];
  archivedExperiments: ExperimentKF[];
  isSubmitting: boolean;
  runStatus: StatusEntry<PipelineRunKF>[];
  experimentStatus: StatusEntry<ExperimentKF>[];
};

const RunsWithArchivedExperimentTable: React.FC<RunsWithArchivedExperimentProps> = ({
  runs,
  archivedExperiments,
  runStatus,
  isSubmitting,
  experimentStatus,
}) => {
  const { experiments: allExperiments } = React.useContext(PipelineRunExperimentsContext);
  const groupedRuns = getGroupRunsByExperiment(runs, allExperiments);

  return (
    <Table variant="compact">
      <Thead noWrap>
        <Tr>
          <Th>Run</Th>
          <Th>Experiment</Th>
        </Tr>
      </Thead>
      <Tbody>
        {groupedRuns.map(({ experiment, run }, i) => (
          <Tr key={i}>
            <Td dataLabel="Runs" modifier="truncate">
              <Stack hasGutter>
                {run.map((singleRun, index) => {
                  const matchingRun = runStatus.find(
                    (currentRun) => currentRun.item.run_id === singleRun.run_id,
                  );

                  return (
                    <StackItem key={index}>
                      <TableText>
                        <RestoreRunsStatusIcon
                          status={matchingRun?.status}
                          isSubmitting={isSubmitting}
                        />{' '}
                        {singleRun.display_name}
                      </TableText>
                      <Content component="small">{singleRun.description}</Content>
                    </StackItem>
                  );
                })}
              </Stack>
            </Td>
            <Td
              dataLabel="Experiment"
              modifier="truncate"
              style={{ paddingInlineStart: 'var(--pf-t--global--spacer--md' }}
            >
              <RestoreRunsTableRowExperiment
                experimentStatus={experimentStatus}
                archivedExperiments={archivedExperiments}
                currentExperiment={experiment}
                isSubmitting={isSubmitting}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default RunsWithArchivedExperimentTable;
