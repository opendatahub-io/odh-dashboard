import * as React from 'react';
import {
  BreadcrumbItem,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  Bullseye,
  Spinner,
  Truncate,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { ApplicationsPage, TrackingOutcome } from '@odh-dashboard/ui-core';
import MarkdownView from '#~/components/MarkdownView';
import { PathProps } from '#~/concepts/pipelines/content/types';
import PipelineRunDetailsActions from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetailsActions';
import PipelineRunDrawerRightContent from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightContent';
import { ArchiveRunModal } from '#~/pages/pipelines/global/runs/ArchiveRunModal';
import DeletePipelineRunsModal from '#~/concepts/pipelines/content/DeletePipelineRunsModal';
import PipelineDetailsTitle from '#~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsTitle';
import usePipelineVersionById from '#~/concepts/pipelines/apiHooks/usePipelineVersionById';
import {
  usePipelineTaskTopology,
  ROOT_LAYER,
  PipelineTopologyLayer,
} from '#~/concepts/pipelines/topology';
import { PipelineRunType } from '#~/pages/pipelines/global/runs/types';
import PipelineRecurringRunReferenceName from '#~/concepts/pipelines/content/PipelineRecurringRunReferenceName';
import useExecutionsForPipelineRun from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/useExecutionsForPipelineRun';
import { useGetEventsByExecutionIds } from '#~/concepts/pipelines/apiHooks/mlmd/useGetEventsByExecutionId';
import { PipelineTopology } from '#~/concepts/topology';
import { FetchState } from '#~/utilities/useFetchState';
import { PipelineRunKF, PipelineSpecVariable, TaskKF } from '#~/concepts/pipelines/kfTypes';
import PipelineNotSupported from '#~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineNotSupported';
import { isArgoWorkflow } from '#~/concepts/pipelines/content/tables/utils';
import { isPipelineRunRegistered } from '#~/concepts/pipelines/content/tables/pipelineRun/utils';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import PipelineContextBreadcrumb from '#~/concepts/pipelines/content/PipelineContextBreadcrumb';
import { findParallelForDagExecution } from '#~/concepts/pipelines/topology/parseUtils';
import { usePipelineRunArtifacts } from './artifacts';
import { PipelineRunDetailsTabs } from './PipelineRunDetailsTabs';

const PipelineRunDetails: React.FC<
  PathProps & {
    fetchedRun: FetchState<PipelineRunKF | null>;
  }
> = ({ fetchedRun, breadcrumbPath, contextPath }) => {
  const navigate = useNavigate();
  const [run, runLoaded, runError] = fetchedRun;
  const [version, versionLoaded, versionError] = usePipelineVersionById(
    run?.pipeline_version_reference?.pipeline_id,
    run?.pipeline_version_reference?.pipeline_version_id,
  );
  const pipelineSpec = version?.pipeline_spec ?? run?.pipeline_spec;
  const [deleting, setDeleting] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[] | undefined>();
  const [layers, setLayers] = React.useState<PipelineTopologyLayer[]>([ROOT_LAYER]);

  const [executions, executionsLoaded, executionsError] = useExecutionsForPipelineRun(run);
  const [artifacts] = usePipelineRunArtifacts(run);
  const [events] = useGetEventsByExecutionIds(
    React.useMemo(() => executions.map((execution) => execution.getId()), [executions]),
  );
  const nodes = usePipelineTaskTopology(
    pipelineSpec,
    run?.run_details,
    executions,
    events,
    artifacts,
    layers,
  );
  const isInvalidPipelineVersion = isArgoWorkflow(version?.pipeline_spec);
  const { status: modelRegistryAvailable } = useIsAreaAvailable(SupportedArea.MODEL_REGISTRY);
  const isRegistered = modelRegistryAvailable ? isPipelineRunRegistered(artifacts) : false;

  const selectedNode = React.useMemo(() => {
    if (isInvalidPipelineVersion) {
      return null;
    }
    return selectedIds ? nodes.find((n) => n.id === selectedIds[0]) : undefined;
  }, [isInvalidPipelineVersion, selectedIds, nodes]);

  const currentLayer = layers[layers.length - 1];
  const drawerExecutions = React.useMemo(() => {
    if (currentLayer.type === 'iteration' && currentLayer.parentDagId != null) {
      return executions.filter((e) => {
        const parentId = e.getCustomPropertiesMap().get('parent_dag_id')?.getIntValue();
        return parentId === currentLayer.parentDagId;
      });
    }
    return executions;
  }, [executions, currentLayer]);

  const handleLayerChange = React.useCallback((newLayers: PipelineTopologyLayer[]) => {
    setLayers(newLayers);
    setSelectedIds(undefined);
  }, []);

  const handleOpenSubDag = React.useCallback(() => {
    if (!selectedNode?.data?.pipelineTask) {
      return;
    }
    const task = selectedNode.data.pipelineTask;
    const nodeId = selectedNode.id;

    const iterationMatch = nodeId.match(/^iteration-(.+)-(\d+)$/);
    if (iterationMatch) {
      const componentRef = iterationMatch[1];
      const iterationIndex = parseInt(iterationMatch[2], 10);
      const { parentDagId } = layers[layers.length - 1];

      const iterExecution =
        parentDagId != null
          ? executions.find((e) => {
              const props = e.getCustomPropertiesMap();
              return (
                props.get('parent_dag_id')?.getIntValue() === parentDagId &&
                props.get('iteration_index')?.getIntValue() === iterationIndex
              );
            })
          : undefined;

      setLayers((prev) => [
        ...prev,
        {
          label: task.name,
          type: 'iteration',
          componentRef,
          iterationIndex,
          parentDagId: iterExecution?.getId(),
        },
      ]);
      setSelectedIds(undefined);
      return;
    }

    if (!pipelineSpec) {
      return;
    }

    const taskEntry = findTaskEntryById(pipelineSpec, nodeId);
    if (!taskEntry) {
      return;
    }

    const componentRef = taskEntry.componentRef.name;

    if (task.iterationCount != null && task.iterationCount > 0) {
      const dagExecution = findParallelForDagExecution(task.name, nodeId, executions);
      setLayers((prev) => [
        ...prev,
        {
          label: task.name,
          type: 'parallelForIterations',
          componentRef,
          iterationCount: task.iterationCount,
          parentDagId: dagExecution?.getId(),
        },
      ]);
    } else {
      setLayers((prev) => [
        ...prev,
        {
          label: task.name,
          type: 'subDag',
          componentRef,
        },
      ]);
    }
    setSelectedIds(undefined);
  }, [selectedNode, pipelineSpec, executions, layers]);

  const loaded = runLoaded && (versionLoaded || !!run?.pipeline_spec || !!versionError);
  const error = runError;

  if (error) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        titleText="Error loading pipeline run details"
        variant={EmptyStateVariant.lg}
        data-id="error-empty-state"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!loaded || (!executionsLoaded && !executionsError)) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const panelContent = selectedNode ? (
    <PipelineRunDrawerRightContent
      task={selectedNode.data.pipelineTask}
      upstreamTaskName={selectedNode.runAfterTasks?.[0]}
      onClose={() => setSelectedIds(undefined)}
      executions={drawerExecutions}
      onOpenSubDag={selectedNode.data.pipelineTask.isSubDag ? handleOpenSubDag : undefined}
    />
  ) : null;

  return (
    <>
      <ApplicationsPage
        title={
          run ? (
            <PipelineDetailsTitle
              run={run}
              statusIcon
              pipelineRunLabel
              isRegistered={isRegistered}
            />
          ) : (
            'Error loading run'
          )
        }
        subtext={
          run && (
            <PipelineRecurringRunReferenceName
              runName={run.display_name}
              recurringRunId={run.recurring_run_id}
            />
          )
        }
        description={
          run?.description ? <MarkdownView conciseDisplay markdown={run.description} /> : ''
        }
        loaded={loaded}
        breadcrumb={
          <PipelineContextBreadcrumb>
            {breadcrumbPath}
            <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
              <Truncate content={run?.display_name ?? 'Loading...'} />
            </BreadcrumbItem>
          </PipelineContextBreadcrumb>
        }
        headerAction={
          <PipelineRunDetailsActions
            run={run}
            onDelete={() => setDeleting(true)}
            onArchive={() => setArchiving(true)}
            isPipelineSupported={!isInvalidPipelineVersion}
          />
        }
        empty={false}
      >
        {isInvalidPipelineVersion ? (
          <PipelineNotSupported />
        ) : (
          <PipelineRunDetailsTabs
            run={run}
            versionError={versionError}
            pipelineSpec={pipelineSpec}
            graphContent={
              <PipelineTopology
                nodes={nodes}
                versionError={versionError}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                sidePanel={panelContent}
                layers={layers}
                onLayerChange={handleLayerChange}
              />
            }
            artifacts={artifacts}
          />
        )}
      </ApplicationsPage>
      <DeletePipelineRunsModal
        type={PipelineRunType.ARCHIVED}
        toDeleteResources={deleting && run ? [run] : []}
        onClose={(deleteComplete) => {
          fireFormTrackingEvent('Pipeline Run Deleted', {
            outcome: TrackingOutcome.submit,
            success: true,
          });
          if (deleteComplete) {
            navigate(contextPath);
          } else {
            setDeleting(false);
          }
        }}
      />
      {archiving ? (
        <ArchiveRunModal runs={run ? [run] : []} onCancel={() => setArchiving(false)} />
      ) : null}
    </>
  );
};

/**
 * Walk the pipeline_spec to locate a task entry by its task ID.
 * Checks root.dag.tasks first, then recursively checks all sub-DAG components.
 */
const findTaskEntryById = (
  specVariable: PipelineSpecVariable,
  taskId: string,
): TaskKF | undefined => {
  const spec = specVariable.pipeline_spec ?? specVariable;
  if (!('root' in spec)) {
    return undefined;
  }

  const rootTasks = spec.root.dag.tasks;
  if (taskId in rootTasks) {
    return rootTasks[taskId];
  }

  for (const component of Object.values(spec.components)) {
    const subTasks = component?.dag?.tasks;
    if (subTasks && taskId in subTasks) {
      return subTasks[taskId];
    }
  }

  return undefined;
};

export default PipelineRunDetails;
