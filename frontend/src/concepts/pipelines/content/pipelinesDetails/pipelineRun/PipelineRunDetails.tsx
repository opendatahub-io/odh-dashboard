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
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ApplicationsPage from '~/pages/ApplicationsPage';
import MarkdownView from '~/components/MarkdownView';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import PipelineRunDetailsActions from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetailsActions';
import PipelineRunDrawerRightContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightContent';
import { ArchiveRunModal } from '~/pages/pipelines/global/runs/ArchiveRunModal';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineDetailsTitle from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsTitle';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import { usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';
import { routePipelineRunsNamespace, routePipelineVersionRunsNamespace } from '~/routes';
import PipelineJobReferenceName from '~/concepts/pipelines/content/PipelineJobReferenceName';
import useExecutionsForPipelineRun from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/useExecutionsForPipelineRun';
import { useGetEventsByExecutionIds } from '~/concepts/pipelines/apiHooks/mlmd/useGetEventsByExecutionId';
import { PipelineTopology } from '~/concepts/topology';
import { StorageStateKF } from '~/concepts/pipelines/kfTypes';
import { usePipelineRunArtifacts } from './artifacts';
import { PipelineRunDetailsTabs } from './PipelineRunDetailsTabs';

const PipelineRunDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath, contextPath }) => {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const [run, runLoaded, runError] = usePipelineRunById(runId, true);
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

  const selectedNode = React.useMemo(
    () => nodes.find((n) => n.id === selectedId),
    [selectedId, nodes],
  );

  const loaded = runLoaded && (versionLoaded || !!run?.pipeline_spec);
  const error = versionError || runError;

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

  const runType =
    run?.storage_state === StorageStateKF.ARCHIVED ? PipelineRunType.ARCHIVED : undefined;

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
            <PipelineJobReferenceName
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
            {breadcrumbPath(runType)}
            <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
              {version ? (
                <Link
                  to={routePipelineVersionRunsNamespace(
                    namespace,
                    version.pipeline_id,
                    version.pipeline_version_id,
                    runType,
                  )}
                >
                  {/* TODO: Remove the custom className after upgrading to PFv6 */}
                  <Truncate content={version.display_name} className="truncate-no-min-width" />
                </Link>
              ) : (
                'Loading...'
              )}
            </BreadcrumbItem>
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
          />
        }
        empty={false}
      >
        <PipelineRunDetailsTabs
          run={run}
          pipelineSpec={version?.pipeline_spec}
          graphContent={
            <PipelineTopology
              nodes={nodes}
              selectedIds={selectedId ? [selectedId] : []}
              onSelectionChange={(ids) => {
                setSelectedId(ids.length ? ids[0] : null);
              }}
              sidePanel={panelContent}
            />
          }
        />
      </ApplicationsPage>
      <DeletePipelineRunsModal
        type={PipelineRunType.ARCHIVED}
        toDeleteResources={deleting && run ? [run] : []}
        onClose={(deleteComplete) => {
          if (deleteComplete) {
            navigate(contextPath ?? routePipelineRunsNamespace(namespace));
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
