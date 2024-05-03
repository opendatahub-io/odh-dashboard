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
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { routePipelineRunsNamespace } from '~/routes';
import SelectedTaskDrawerContent from '~/concepts/pipelines/content/pipelinesDetails/pipeline/SelectedTaskDrawerContent';
import PipelineRunJobDetailsActions from './PipelineRunJobDetailsActions';

const PipelineRunJobDetails: PipelineCoreDetailsPageComponent = ({
  breadcrumbPath,
  contextPath,
}) => {
  const { recurringRunId } = useParams();
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const [job, jobLoaded, jobError] = usePipelineRunJobById(recurringRunId);
  const [version, versionLoaded, versionError] = usePipelineVersionById(
    job?.pipeline_version_reference.pipeline_id,
    job?.pipeline_version_reference.pipeline_version_id,
  );
  const [deleting, setDeleting] = React.useState(false);
  const [detailsTab, setDetailsTab] = React.useState<RunDetailsTabSelection>(
    RunDetailsTabs.DETAILS,
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const nodes = usePipelineTaskTopology(version?.pipeline_spec);

  const selectedNode = React.useMemo(
    () => nodes.find((n) => n.id === selectedId),
    [selectedId, nodes],
  );

  const getFirstNode = (firstId: string) => nodes.find((n) => n.id === firstId)?.data?.pipelineTask;

  const loaded = versionLoaded && jobLoaded;
  const error = versionError || jobError;

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
      <Drawer isExpanded={!!selectedNode}>
        <DrawerContent
          panelContent={
            <SelectedTaskDrawerContent
              task={selectedNode?.data.pipelineTask}
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
                    pipelineRunDetails={job && version?.pipeline_spec ? job : undefined}
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
                        } else if (getFirstNode(firstId)) {
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
