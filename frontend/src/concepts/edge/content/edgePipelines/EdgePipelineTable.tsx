import { EmptyState, EmptyStateBody, Title } from '@patternfly/react-core';
import React from 'react';
import { Table } from '~/components/table';
import { EdgeModel } from '~/concepts/edge/types';
import { PipelineKind } from '~/k8sTypes';
import { EDGE_CONSTANT, EDGE_UNIQUE_LABEL } from '~/concepts/edge/const';
import { getModelsForPipeline } from '~/concepts/edge/utils';
import EdgePipelineRow from './EdgePipelineRow';
import { edgePipelineColumns } from './const';
import CreateRunModel from './CreateRunModal';

type EdgePipelineTableProps = {
  models: EdgeModel[];
  pipelines: PipelineKind[];
};

export const EdgePipelineTable: React.FC<EdgePipelineTableProps> = ({ models, pipelines }) => {
  const [createRunSelectedPipeline, setCreateRunSelectedPipeline] = React.useState<PipelineKind>();

  if (pipelines.length === 0) {
    return (
      <EmptyState variant="xs" data-testid="edge-piplines-modal-empty-state">
        <Title headingLevel="h2" size="lg">
          No edge pipelines found
        </Title>
        <EmptyStateBody>{`An edge pipeline must be created in the ${EDGE_CONSTANT} namespace and have the label ${EDGE_UNIQUE_LABEL}`}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <Table
        data={pipelines}
        columns={edgePipelineColumns}
        rowRenderer={(pipeline, rowIndex) => (
          <EdgePipelineRow
            key={pipeline.metadata.name}
            rowIndex={rowIndex}
            pipeline={pipeline}
            onCreateRun={() => setCreateRunSelectedPipeline(pipeline)}
            models={getModelsForPipeline(pipeline, models)}
          />
        )}
      />
      <CreateRunModel
        isOpen={!!createRunSelectedPipeline}
        pipelineName={createRunSelectedPipeline?.metadata.name ?? ''}
        models={
          createRunSelectedPipeline ? getModelsForPipeline(createRunSelectedPipeline, models) : []
        }
        onClose={() => setCreateRunSelectedPipeline(undefined)}
        onCreate={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    </>
  );
};
