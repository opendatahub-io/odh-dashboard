import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateBody,
  Bullseye,
  Spinner,
  Truncate,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ApplicationsPage from '~/pages/ApplicationsPage';
import MarkdownView from '~/components/MarkdownView';
import { PathProps } from '~/concepts/pipelines/content/types';
import PipelineRunDetailsActions from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetailsActions';
import PipelineRunDrawerRightContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightContent';
import { ArchiveRunModal } from '~/pages/pipelines/global/runs/ArchiveRunModal';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import PipelineDetailsTitle from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsTitle';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import { usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';
import PipelineRecurringRunReferenceName from '~/concepts/pipelines/content/PipelineRecurringRunReferenceName';
import useExecutionsForPipelineRun from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/useExecutionsForPipelineRun';
import { useGetEventsByExecutionIds } from '~/concepts/pipelines/apiHooks/mlmd/useGetEventsByExecutionId';
import { PipelineTopology } from '~/concepts/topology';
import { FetchState } from '~/utilities/useFetchState';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import PipelineNotSupported from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineNotSupported';
import { isArgoWorkflow } from '~/concepts/pipelines/content/tables/utils';
import { usePipelineRunArtifacts } from './artifacts';
import { PipelineRunDetailsTabs } from './PipelineRunDetailsTabs';

const PipelineRunDetails: React.FC<
  PathProps & {
    fetchedRun: FetchState<PipelineRunKFv2 | null>;
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
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

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
  );
  const isInvalidPipelineVersion = isArgoWorkflow(version?.pipeline_spec);

  const selectedNode = React.useMemo(() => {
    if (isInvalidPipelineVersion) {
      return null;
    }
    return nodes.find((n) => n.id === selectedId);
  }, [isInvalidPipelineVersion, selectedId, nodes]);

  const loaded = runLoaded && (versionLoaded || !!run?.pipeline_spec || !!versionError);
  const error = runError;

  if (error) {
    return (
      <EmptyState variant={EmptyStateVariant.lg} data-id="error-empty-state">
        <EmptyStateHeader
          titleText="Error loading pipeline run details"
          icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
          headingLevel="h4"
        />
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
      onClose={() => setSelectedId(null)}
      executions={executions}
    />
  ) : null;

  return (
    <>
      <ApplicationsPage
        title={
          run ? <PipelineDetailsTitle run={run} statusIcon pipelineRunLabel /> : 'Error loading run'
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
        loadError={error}
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath}
            <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
              {/* TODO: Remove the custom className after upgrading to PFv6 */}
              <Truncate
                content={run?.display_name ?? 'Loading...'}
                className="truncate-no-min-width"
              />
            </BreadcrumbItem>
          </Breadcrumb>
        }
        headerAction={
          <PipelineRunDetailsActions
            run={run}
            onDelete={() => setDeleting(true)}
            onArchive={() => setArchiving(true)}
            isPipelineSupported={!isArgoWorkflow(version?.pipeline_spec)}
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
            pipelineSpec={version?.pipeline_spec}
            graphContent={
              <PipelineTopology
                nodes={nodes}
                versionError={versionError}
                selectedIds={selectedId ? [selectedId] : []}
                onSelectionChange={(ids) => {
                  const firstId = ids[0];
                  if (ids.length === 0) {
                    setSelectedId(null);
                  } else if (nodes.find((node) => node.id === firstId)) {
                    setSelectedId(firstId);
                  }
                }}
                sidePanel={panelContent}
              />
            }
          />
        )}
      </ApplicationsPage>
      <DeletePipelineRunsModal
        type={PipelineRunType.ARCHIVED}
        toDeleteResources={deleting && run ? [run] : []}
        onClose={(deleteComplete) => {
          if (deleteComplete) {
            navigate(contextPath);
          } else {
            setDeleting(false);
          }
        }}
      />
      <ArchiveRunModal
        isOpen={archiving}
        runs={run ? [run] : []}
        onCancel={() => setArchiving(false)}
      />
    </>
  );
};

export default PipelineRunDetails;
