import * as React from 'react';
import { Td, Tr, ExpandableRowContent } from '@patternfly/react-table';
import {
  EmptyState,
  EmptyStateVariant,
  Spinner,
  EmptyStateActions,
  EmptyStateHeader,
  EmptyStateFooter,
  Bullseye,
} from '@patternfly/react-core';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import ImportPipelineVersionButton from '~/concepts/pipelines/content/import/ImportPipelineVersionButton';
import PipelineVersionTable from '~/concepts/pipelines/content/tables/pipelineVersion/PipelineVersionTable';
import usePipelineVersionsTable from '~/concepts/pipelines/content/tables/pipelineVersion/usePipelineVersionsTable';

type PipelinesTableExpandedRowProps = {
  pipeline: PipelineKF;
  pipelineDetailsPath: (namespace: string, id: string) => string;
};

const PipelinesTableExpandedRow: React.FC<PipelinesTableExpandedRowProps> = ({
  pipeline,
  pipelineDetailsPath,
}) => {
  const [
    [{ items: initialVersions, totalSize, nextPageToken }, loaded],
    { initialLoaded, ...tableProps },
  ] = usePipelineVersionsTable(pipeline.id)();

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
            <EmptyState variant={EmptyStateVariant.xs}>
              <EmptyStateHeader titleText="No pipeline versions" headingLevel="h3" />
              <EmptyStateFooter>
                <EmptyStateActions>
                  <ImportPipelineVersionButton pipeline={pipeline} variant="link" />
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
      <Td className="pf-v5-u-pb-lg" noPadding colSpan={6}>
        <ExpandableRowContent>
          <PipelineVersionTable
            {...tableProps}
            initialVersions={initialVersions}
            loading={!loaded}
            totalSize={totalSize}
            pipelineDetailsPath={pipelineDetailsPath}
            nextPageToken={nextPageToken}
            pipeline={pipeline}
          />
        </ExpandableRowContent>
      </Td>
    </Tr>
  );
};

export default PipelinesTableExpandedRow;
