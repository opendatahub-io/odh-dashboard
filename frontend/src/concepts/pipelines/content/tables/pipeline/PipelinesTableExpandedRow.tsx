import * as React from 'react';
import { Td, Tr, ExpandableRowContent } from '@patternfly/react-table';
import {
  EmptyState,
  EmptyStateVariant,
  Spinner,
  EmptyStateActions,
  EmptyStateFooter,
  Bullseye,
} from '@patternfly/react-core';
import { PipelineKF } from '#~/concepts/pipelines/kfTypes';
import PipelineVersionTable from '#~/concepts/pipelines/content/tables/pipelineVersion/PipelineVersionTable';
import usePipelineVersionsTable from '#~/concepts/pipelines/content/tables/pipelineVersion/usePipelineVersionsTable';
import { getTableSortProps } from '#~/concepts/pipelines/content/tables/usePipelineTable';
import ImportPipelineVersionButton from '#~/concepts/pipelines/content/import/ImportPipelineVersionButton';

type PipelinesTableExpandedRowProps = {
  pipeline: PipelineKF;
};

const PipelinesTableExpandedRow: React.FC<PipelinesTableExpandedRowProps> = ({ pipeline }) => {
  const [
    [{ items: initialVersions, totalSize, nextPageToken }, loaded],
    { initialLoaded, ...tableProps },
  ] = usePipelineVersionsTable(pipeline.pipeline_id)();

  const sortProps = getTableSortProps(tableProps);

  if (!loaded && !initialLoaded) {
    return (
      <Tr isExpanded>
        <Td />
        <Td colSpan={6}>
          <ExpandableRowContent>
            <Bullseye>
              <Spinner />
            </Bullseye>
          </ExpandableRowContent>
        </Td>
      </Tr>
    );
  }

  if (loaded && initialVersions.length === 0) {
    return (
      <Tr isExpanded>
        <Td />
        <Td colSpan={6}>
          <ExpandableRowContent>
            <EmptyState
              headingLevel="h3"
              titleText="No pipeline versions"
              variant={EmptyStateVariant.xs}
              data-testid="no-pipeline-versions"
            >
              <EmptyStateFooter>
                <EmptyStateActions>
                  <ImportPipelineVersionButton selectedPipeline={pipeline} variant="link" />
                </EmptyStateActions>
              </EmptyStateFooter>
            </EmptyState>
          </ExpandableRowContent>
        </Td>
      </Tr>
    );
  }

  return (
    <Tr isExpanded>
      <Td />
      <Td className="pf-v6-u-pb-lg" noPadding colSpan={6}>
        <ExpandableRowContent>
          <PipelineVersionTable
            {...sortProps}
            initialVersions={initialVersions}
            loading={!loaded}
            totalSize={totalSize}
            nextPageToken={nextPageToken}
            pipeline={pipeline}
          />
        </ExpandableRowContent>
      </Td>
    </Tr>
  );
};

export default PipelinesTableExpandedRow;
