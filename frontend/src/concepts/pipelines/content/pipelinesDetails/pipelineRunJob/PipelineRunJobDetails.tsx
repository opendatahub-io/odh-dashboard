import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateBody,
  Title,
  Bullseye,
  Spinner,
} from '@patternfly/react-core';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import { PipelineTopology } from '~/concepts/topology';
import MarkdownView from '~/components/MarkdownView';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import usePipelineRunJobById from '~/concepts/pipelines/apiHooks/usePipelineRunJobById';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import { routePipelineRunsNamespace, routePipelineVersionRunsNamespace } from '~/routes';
import SelectedTaskDrawerContent from '~/concepts/pipelines/content/pipelinesDetails/pipeline/SelectedTaskDrawerContent';
import { PipelineRunDetailsTabs } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetailsTabs';
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
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const nodes = usePipelineTaskTopology(version?.pipeline_spec);

  const selectedNode = React.useMemo(
    () => nodes.find((n) => n.id === selectedId),
    [selectedId, nodes],
  );

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

  const panelContent = selectedNode ? (
    <SelectedTaskDrawerContent
      task={selectedNode.data.pipelineTask}
      onClose={() => setSelectedId(null)}
    />
  ) : null;

  return (
    <>
      <ApplicationsPage
        title={job?.display_name}
        description={job ? <MarkdownView conciseDisplay markdown={job.description} /> : ''}
        loaded={loaded}
        loadError={error}
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath(PipelineRunType.SCHEDULED)}
            <BreadcrumbItem isActive style={{ maxWidth: 300 }}>
              {version ? (
                <Link
                  to={routePipelineVersionRunsNamespace(
                    namespace,
                    version.pipeline_id,
                    version.pipeline_version_id,
                    PipelineRunType.SCHEDULED,
                  )}
                >
                  {version.display_name}
                </Link>
              ) : (
                'Loading...'
              )}
            </BreadcrumbItem>
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
        <PipelineRunDetailsTabs
          run={job}
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
        type={PipelineRunType.SCHEDULED}
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
