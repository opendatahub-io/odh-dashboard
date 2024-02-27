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
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ApplicationsPage from '~/pages/ApplicationsPage';
import MarkdownView from '~/components/MarkdownView';
import usePipelineRunById from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
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
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import { usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import usePipelineRunJobById from '~/concepts/pipelines/apiHooks/usePipelineRunJobById';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';

const PipelineRunDetails: PipelineCoreDetailsPageComponent = ({ breadcrumbPath, contextPath }) => {
  const { pipelineRunId } = useParams();
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const [runResource, loaded, error] = usePipelineRunById(pipelineRunId, true);
  const [job] = usePipelineRunJobById(runResource?.recurring_run_id);
  const [version] = usePipelineVersionById(
    runResource?.pipeline_version_reference.pipeline_id,
    runResource?.pipeline_version_reference.pipeline_version_id,
  );
  const [deleting, setDeleting] = React.useState(false);
  const [detailsTab, setDetailsTab] = React.useState<RunDetailsTabSelection>(
    RunDetailsTabs.DETAILS,
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { taskMap, nodes } = usePipelineTaskTopology(version?.pipeline_spec);

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
              // TODO need to get pipeline runtime for v2. https://issues.redhat.com/browse/RHOAIENG-2297
              // parameters={pipelineRuntime?.spec?.params}
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
                      runResource && version?.pipeline_spec
                        ? { kf: runResource, kind: version?.pipeline_spec }
                        : undefined
                    }
                  />
                }
              >
                <ApplicationsPage
                  title={
                    runResource ? (
                      <PipelineDetailsTitle run={runResource} statusIcon pipelineRunLabel />
                    ) : (
                      'Error loading run'
                    )
                  }
                  jobReferenceName={job && <PipelineJobReferenceName resource={job} />}
                  description={
                    runResource ? (
                      <MarkdownView conciseDisplay markdown={runResource.description} />
                    ) : (
                      ''
                    )
                  }
                  loaded={loaded}
                  loadError={error}
                  breadcrumb={
                    <Breadcrumb>
                      {breadcrumbPath}
                      <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
                        <Truncate content={runResource?.display_name ?? 'Loading...'} />
                      </BreadcrumbItem>
                    </Breadcrumb>
                  }
                  headerAction={
                    loaded && (
                      <PipelineRunDetailsActions
                        run={runResource}
                        onDelete={() => setDeleting(true)}
                      />
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
        type={PipelineRunType.Archived}
        toDeleteResources={deleting && runResource ? [runResource] : []}
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
