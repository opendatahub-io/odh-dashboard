import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Drawer,
  DrawerContent,
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateBody,
  Title,
  Bullseye,
  Spinner,
  DrawerContentBody,
} from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import * as jsYaml from 'js-yaml';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import { PipelineTopology, PipelineTopologyEmpty } from '~/concepts/topology';
import { PipelineRunKind } from '~/k8sTypes';
import MarkdownView from '~/components/MarkdownView';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import { PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';
import PipelineRunDrawerBottomContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerBottomContent';
import {
  RunDetailsTabs,
  RunDetailsTabSelection,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerBottomTabs';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineRunJobById from '~/concepts/pipelines/apiHooks/usePipelineRunJobById';
import PipelineRunDrawerRightContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightContent';
import PipelineRunJobDetailsActions from './PipelineRunJobDetailsActions';

const getPipelineRunKind = (job?: PipelineRunJobKF['pipeline_spec']): PipelineRunKind | null => {
  if (!job?.workflow_manifest) {
    return null;
  }
  try {
    return jsYaml.load(job.workflow_manifest) as PipelineRunKind;
    // return JSON.parse(job.workflow_manifest);
  } catch (e) {
    return null;
  }
};

const PipelineRunJobDetails: PipelineCoreDetailsPageComponent = ({
  breadcrumbPath,
  contextPath,
}) => {
  const { pipelineRunJobId } = useParams();
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();

  // TODO, issues.redhat.com/browse/RHOAIENG-2282
  const [, loaded, error] = usePipelineRunJobById(pipelineRunJobId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = {} as any;
  const [deleting, setDeleting] = React.useState(false);
  const [detailsTab, setDetailsTab] = React.useState<RunDetailsTabSelection>(
    RunDetailsTabs.DETAILS,
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const pipelineRuntime = getPipelineRunKind(job?.pipeline_spec);
  const { taskMap, nodes } = usePipelineTaskTopology(pipelineRuntime);

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
        <EmptyStateIcon icon={ExclamationCircleIcon} />
        <Title headingLevel="h4" size="lg">
          Error loading pipeline scheduled run details
        </Title>
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
                    // TODO, https://issues.redhat.com/browse/RHOAIENG-2282
                    // pipelineRunDetails={
                    //   job && pipelineRuntime ? { kf: job, kind: pipelineRuntime } : undefined
                    // }
                  />
                }
              >
                <ApplicationsPage
                  title={error ? 'Error loading scheduled run' : job?.name}
                  description={
                    job ? <MarkdownView conciseDisplay markdown={job.description} /> : ''
                  }
                  loaded={loaded}
                  loadError={error}
                  breadcrumb={
                    <Breadcrumb>
                      {breadcrumbPath}
                      <BreadcrumbItem isActive>
                        {error ? 'Scheduled run details' : job?.name ?? 'Loading...'}
                      </BreadcrumbItem>
                    </Breadcrumb>
                  }
                  headerAction={
                    loaded &&
                    !error && (
                      <PipelineRunJobDetailsActions
                        job={job ?? undefined}
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
        type="scheduled run"
        // TODO - remove cast, https://issues.redhat.com/browse/RHOAIENG-2294
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toDeleteResources={(deleting && job ? [job] : []) as any}
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

export default PipelineRunJobDetails;
