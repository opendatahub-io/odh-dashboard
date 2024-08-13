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
import { useNavigate, useParams } from 'react-router-dom';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import { PipelineTopology } from '~/concepts/topology';
import MarkdownView from '~/components/MarkdownView';
import { PipelineCoreDetailsPageComponent } from '~/concepts/pipelines/content/types';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import { PipelineRunType } from '~/pages/pipelines/global/runs';
import SelectedTaskDrawerContent from '~/concepts/pipelines/content/pipelinesDetails/pipeline/SelectedTaskDrawerContent';
import { PipelineRunDetailsTabs } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/PipelineRunDetailsTabs';
import usePipelineRecurringRunById from '~/concepts/pipelines/apiHooks/usePipelineRecurringRunById';
import PipelineNotSupported from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineNotSupported';
import { isArgoWorkflow } from '~/concepts/pipelines/content/tables/utils';
import PipelineRecurringRunDetailsActions from './PipelineRecurringRunDetailsActions';

const PipelineRecurringRunDetails: PipelineCoreDetailsPageComponent = ({
  breadcrumbPath,
  contextPath,
}) => {
  const { recurringRunId } = useParams();
  const navigate = useNavigate();
  const [recurringRun, recurringRunLoaded, recurringRunError] =
    usePipelineRecurringRunById(recurringRunId);
  const [version, versionLoaded, versionError] = usePipelineVersionById(
    recurringRun?.pipeline_version_reference.pipeline_id,
    recurringRun?.pipeline_version_reference.pipeline_version_id,
  );
  const [deleting, setDeleting] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const nodes = usePipelineTaskTopology(version?.pipeline_spec);
  const isInvalidPipelineVersion = isArgoWorkflow(version?.pipeline_spec);

  const selectedNode = React.useMemo(() => {
    if (isInvalidPipelineVersion) {
      return null;
    }
    return nodes.find((n) => n.id === selectedId);
  }, [isInvalidPipelineVersion, selectedId, nodes]);

  const getFirstNode = (firstId: string) => {
    if (isInvalidPipelineVersion) {
      return null;
    }
    return nodes.find((n) => n.id === firstId)?.data?.pipelineTask;
  };

  const loaded = versionLoaded && recurringRunLoaded;
  const error = versionError || recurringRunError;

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
        title={recurringRun?.display_name}
        description={
          recurringRun ? <MarkdownView conciseDisplay markdown={recurringRun.description} /> : ''
        }
        loaded={loaded}
        loadError={error}
        breadcrumb={
          <Breadcrumb>
            {breadcrumbPath}
            <BreadcrumbItem isActive>{recurringRun?.display_name ?? 'Loading...'}</BreadcrumbItem>
          </Breadcrumb>
        }
        headerAction={
          loaded && (
            <PipelineRecurringRunDetailsActions
              recurringRun={recurringRun ?? undefined}
              onDelete={() => setDeleting(true)}
              isPipelineSupported={!isArgoWorkflow(version?.pipeline_spec)}
            />
          )
        }
        empty={false}
      >
        {isInvalidPipelineVersion ? (
          <PipelineNotSupported />
        ) : (
          <PipelineRunDetailsTabs
            run={recurringRun}
            pipelineSpec={version?.pipeline_spec}
            graphContent={
              <PipelineTopology
                nodes={nodes}
                selectedIds={selectedId ? [selectedId] : []}
                onSelectionChange={(ids) => {
                  const firstId = ids[0];
                  if (ids.length === 0) {
                    setSelectedId(null);
                  } else if (getFirstNode(firstId)) {
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
        type={PipelineRunType.SCHEDULED}
        toDeleteResources={deleting && recurringRun ? [recurringRun] : []}
        onClose={(deleteComplete) => {
          if (deleteComplete) {
            navigate(contextPath);
          } else {
            setDeleting(false);
          }
        }}
      />
    </>
  );
};

export default PipelineRecurringRunDetails;
