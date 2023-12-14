import React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateIcon,
  EmptyStateVariant,
  Title,
  ToolbarItem,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Table } from '~/components/table';
import { EdgeModel } from '~/concepts/edge/types';
import CreateRunModel from '~/concepts/edge/content/pipelines/CreateRunModal';
import ManageEdgeModelModal from '~/concepts/edge/content/models/ManageEdgeModels';
import { PipelineKind } from '~/k8sTypes';
import EmptyEdgePipelines from '~/concepts/edge/content/pipelines/table/EmptyEdgePipelines';
import { edgeModelsColumns } from './const';
import EdgeModelRow from './EdgeModelRow';

type EdgeModelsTableProps = {
  models: EdgeModel[];
  pipelines: PipelineKind[];
  refreshAllData: () => void;
};

export const EdgeModelsTable: React.FC<EdgeModelsTableProps> = ({
  models,
  pipelines,
  refreshAllData,
}) => {
  const [createRunSelectedModel, setCreateRunSelectedModel] = React.useState<EdgeModel>();
  const [editEdgeModelModal, setEditEdgeModelModal] = React.useState<EdgeModel>();
  const [manageEdgeModelModalOpen, setManageEdgeModelModalOpen] = React.useState(false);

  if (pipelines.length === 0) {
    return <EmptyEdgePipelines />;
  }

  const sortedModels = models.sort(
    (a, b) =>
      new Date(b.latestRun.run.metadata.creationTimestamp ?? '').getTime() -
      new Date(a.latestRun.run.metadata.creationTimestamp ?? '').getTime(),
  );

  if (sortedModels.length === 0) {
    return (
      <>
        <EmptyState variant={EmptyStateVariant.lg}>
          <EmptyStateIcon icon={PlusCircleIcon} />
          <Title headingLevel="h1" size="lg">
            No models added
          </Title>
          <EmptyStateBody>
            To get started, add a model. Adding a model will also initiate a pipeline that will
            build the model and its dependencies into a container image and save that image in a
            container image registry.
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button onClick={() => setManageEdgeModelModalOpen(true)}>Add model</Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
        <ManageEdgeModelModal
          isOpen={manageEdgeModelModalOpen}
          existingModel={editEdgeModelModal}
          onClose={() => {
            setManageEdgeModelModalOpen(false);
            setEditEdgeModelModal(undefined);
          }}
          onAdd={() => {
            refreshAllData();
          }}
        />
      </>
    );
  }

  return (
    <>
      <Table
        data={sortedModels}
        columns={edgeModelsColumns}
        rowRenderer={(model, rowIndex) => (
          <EdgeModelRow
            key={model.latestRun.modelName}
            model={model}
            rowIndex={rowIndex}
            onEdit={() => {
              setEditEdgeModelModal(model);
              setManageEdgeModelModalOpen(true);
            }}
            onRerun={() => setCreateRunSelectedModel(model)}
          />
        )}
        toolbarContent={
          <ToolbarItem>
            <Button onClick={() => setManageEdgeModelModalOpen(true)}>Add model</Button>
          </ToolbarItem>
        }
      />
      <ManageEdgeModelModal
        isOpen={manageEdgeModelModalOpen}
        existingModel={editEdgeModelModal}
        onClose={() => {
          setManageEdgeModelModalOpen(false);
          setEditEdgeModelModal(undefined);
        }}
        onAdd={() => {
          refreshAllData();
        }}
      />
      <CreateRunModel
        isOpen={!!createRunSelectedModel}
        pipelineName={createRunSelectedModel?.latestRun.run.spec.pipelineRef?.name}
        model={createRunSelectedModel}
        onClose={() => setCreateRunSelectedModel(undefined)}
        onCreate={() => {
          refreshAllData();
        }}
      />
    </>
  );
};
