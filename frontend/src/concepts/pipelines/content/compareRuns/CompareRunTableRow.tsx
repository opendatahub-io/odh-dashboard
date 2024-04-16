import * as React from 'react';
import { TableText, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { Skeleton } from '@patternfly/react-core';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { CheckboxTd, TableRowTitleDescription } from '~/components/table';
import {
  RunCreated,
  RunDuration,
  RunStatus,
} from '~/concepts/pipelines/content/tables/renderUtils';
import useExperimentById from '~/concepts/pipelines/apiHooks/useExperimentById';
import usePipelineRunVersionInfo from '~/concepts/pipelines/content/tables/usePipelineRunVersionInfo';
import { PipelineVersionLink } from '~/concepts/pipelines/content/PipelineVersionLink';
import { runDetailsRoute } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type CompareRunTableRowProps = {
  isChecked: boolean;
  onToggleCheck: () => void;
  run: PipelineRunKFv2;
};

const CompareRunTableRow: React.FC<CompareRunTableRowProps> = ({
  isChecked,
  onToggleCheck,
  run,
}) => {
  const { namespace } = usePipelinesAPI();
  const [experiment, isExperimentLoaded] = useExperimentById(run.experiment_id);
  const { version, loaded: isVersionLoaded, error: versionError } = usePipelineRunVersionInfo(run);

  return (
    <Tr>
      <CheckboxTd id={run.run_id} isChecked={isChecked} onToggle={onToggleCheck} />
      <Td dataLabel="Run">
        <TableRowTitleDescription
          title={
            <TableText wrapModifier="truncate">
              <Link to={runDetailsRoute(namespace, run.run_id, run.experiment_id)}>
                {run.display_name}
              </Link>
            </TableText>
          }
          description={run.description}
        />
      </Td>
      <Td dataLabel="Experiment">
        {isExperimentLoaded ? experiment?.display_name || 'Default' : <Skeleton />}
      </Td>
      <Td modifier="truncate" dataLabel="Pipeline version">
        <PipelineVersionLink
          displayName={version?.display_name}
          version={version}
          error={versionError}
          loaded={isVersionLoaded}
        />
      </Td>
      <Td dataLabel="Started">
        <RunCreated run={run} />
      </Td>
      <Td dataLabel="Duration">
        <RunDuration run={run} />
      </Td>
      <Td dataLabel="Status">
        <RunStatus justIcon run={run} />
      </Td>
    </Tr>
  );
};

export default CompareRunTableRow;
