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
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import { PipelineTopology, PipelineTopologyEmpty } from '~/concepts/topology';
import MarkdownView from '~/components/MarkdownView';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';

import PipelineRunDrawerBottomContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerBottomContent';
import {
  RunDetailsTabs,
  RunDetailsTabSelection,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerBottomTabs';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineRunJobById from '~/concepts/pipelines/apiHooks/usePipelineRunJobById';
import PipelineRunDrawerRightContent from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDrawerRightContent';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { routePipelineRunsNamespace } from '~/routes';
import PipelineRunJobDetailsActions from './PipelineRunJobDetailsActions';

const PipelineRunJobDetails: PipelineCoreDetailsPageComponent = ({
  breadcrumbPath,
  contextPath,
}) => {
  const { pipelineRunJobId } = useParams();
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const [job, loaded, error] = usePipelineRunJobById(pipelineRunJobId);
  const [version] = usePipelineVersionById(
    job?.pipeline_version_reference.pipeline_id,
    job?.pipeline_version_reference.pipeline_version_id,
  );
  const [deleting, setDeleting] = React.useState(false);
  const [detailsTab, setDetailsTab] = React.useState<RunDetailsTabSelection>(
    RunDetailsTabs.DETAILS,
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // TODO need to get pipeline runtime for v2. but should jobs really have a graph view? https://issues.redhat.com/browse/RHOAIENG-2297
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
        <EmptyStateIcon icon={ExclamationCircleIcon} />
        <Title headingLevel="h4" size="lg">
          Error loading pipeline schedule details
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
              // TODO need to get pipeline runtime for v2. https://issues.redhat.com/browse/RHOAIENG-2297
              // parameters={job?.runtime_config.parameters}
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
                      job && version?.pipeline_spec
                        ? { kf: job, kind: version.pipeline_spec }
                        : undefined
                    }
                  />
                }
              >
                <ApplicationsPage
                  title={job?.display_name}
                  description={
                    job ? <MarkdownView conciseDisplay markdown={job.description} /> : ''
                  }
                  loaded={loaded}
                  loadError={error}
                  breadcrumb={
                    <Breadcrumb>
                      {breadcrumbPath}
                      <BreadcrumbItem isActive>{job?.display_name ?? 'Loading...'}</BreadcrumbItem>
                    </Breadcrumb>
                  }
                  headerAction={
                    loaded && (
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
        type={PipelineRunType.Scheduled}
        toDeleteResources={deleting && job ? [job] : []}
        onClose={(deleteComplete) => {
          if (deleteComplete) {
            navigate(contextPath ?? routePipelineRunsNamespace(namespace));
          } else {
            setDeleting(false);
          }
        }}
      />
    </>
  );
};

export default PipelineRunJobDetails;
