import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateBody,
  Bullseye,
  Spinner,
  Truncate,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import { PipelineRunKind } from '~/k8sTypes';
import MarkdownView from '~/components/MarkdownView';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import { PipelineRunResourceKF } from '~/concepts/pipelines/kfTypes';
import PipelineRunDrawerBottomContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerBottomContent';
import PipelineRunDetailsActions from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetailsActions';
import PipelineRunDrawerRightContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightContent';
import {
  RunDetailsTabs,
  RunDetailsTabSelection,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerBottomTabs';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineDetailsTitle from '~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsTitle';
import PipelineJobReferenceName from '~/concepts/pipelines/content/PipelineJobReferenceName';
import { PipelineTopology, PipelineTopologyEmpty } from '~/concepts/topology';

const getPipelineRunKind = (
  pipelineRuntime?: PipelineRunResourceKF['pipeline_runtime'],
): PipelineRunKind | null => {
  if (!pipelineRuntime) {
    return null;
  }
  try {
    return JSON.parse(pipelineRuntime.workflow_manifest);
  } catch (e) {
    return null;
  }
};

const PipelineRunDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath, contextPath }) => {
  const { pipelineRunId } = useParams();
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const [runResource, loaded, error] = usePipelineRunById(pipelineRunId, true);
  const [deleting, setDeleting] = React.useState(false);
  const [detailsTab, setDetailsTab] = React.useState<RunDetailsTabSelection>(
    RunDetailsTabs.DETAILS,
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const pipelineRuntime = getPipelineRunKind(runResource?.pipeline_runtime);
  const { taskMap, nodes } = usePipelineTaskTopology(pipelineRuntime);
  const run = runResource?.run;

  if (!loaded && !error) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

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

  return (
    <>
      <Drawer isExpanded={!!selectedId}>
        <DrawerContent
          panelContent={
            <PipelineRunDrawerRightContent
              task={selectedId ? taskMap[selectedId] : undefined}
              parameters={pipelineRuntime?.spec.params}
              taskReferences={taskMap}
              onClose={() => setSelectedId(null)}
            />
          }
        >
          <DrawerContentBody>
            <Drawer isInline isExpanded position="bottom">
              <DrawerContent
                panelContent={
                  <PipelineRunDrawerBottomContent
                    detailsTab={detailsTab}
                    onSelectionChange={(selection) => {
                      setDetailsTab(selection);
                      setSelectedId(null);
                    }}
                    pipelineRunDetails={
                      runResource && pipelineRuntime
                        ? { kf: runResource.run, kind: pipelineRuntime }
                        : undefined
                    }
                  />
                }
              >
                <ApplicationsPage
                  title={
                    run && !error ? (
                      <PipelineDetailsTitle run={run} statusIcon pipelineRunLabel />
                    ) : (
                      'Error loading run'
                    )
                  }
                  jobReferenceName={run && <PipelineJobReferenceName resource={run} />}
                  description={
                    run ? <MarkdownView conciseDisplay markdown={run.description} /> : ''
                  }
                  loaded={loaded}
                  loadError={error}
                  breadcrumb={
                    <Breadcrumb>
                      {breadcrumbPath}
                      <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
                        <Truncate content={error ? 'Run details' : run?.name ?? 'Loading...'} />
                      </BreadcrumbItem>
                    </Breadcrumb>
                  }
                  headerAction={
                    loaded &&
                    !error && (
                      <PipelineRunDetailsActions run={run} onDelete={() => setDeleting(true)} />
                    )
                  }
                  empty={false}
                >
                  {nodes.length === 0 ? (
                    <PipelineTopologyEmpty />
                  ) : (
                    <PipelineTopology
                      nodes={nodes}
                      selectedIds={selectedId ? [selectedId] : []}
                      onSelectionChange={(ids) => {
                        const firstId = ids[0];
                        if (ids.length === 0) {
                          setSelectedId(null);
                        } else if (taskMap[firstId]) {
                          setDetailsTab(null);
                          setSelectedId(firstId);
                        }
                      }}
                    />
                  )}
                </ApplicationsPage>
              </DrawerContent>
            </Drawer>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
      <DeletePipelineRunsModal
        type="triggered run"
        toDeleteResources={deleting && run ? [run] : []}
        onClose={(deleteComplete) => {
          if (deleteComplete) {
            navigate(contextPath ?? `/pipelineRuns/${namespace}`);
          } else {
            setDeleting(false);
          }
        }}
      />
    </>
  );
};

export default PipelineRunDetails;
