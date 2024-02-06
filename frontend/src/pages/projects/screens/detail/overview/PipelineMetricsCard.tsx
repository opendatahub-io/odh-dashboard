import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ButtonVariant } from '@patternfly/react-core';
import pipelineImg from '~/images/UI_icon-Red_Hat-Branch-RGB.svg';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import { AccessReviewResource } from '~/pages/projects/screens/detail/const';
import MetricsCard from '~/pages/projects/screens/detail/overview/MetricsCard';
import usePipelineRunJobs from '~/concepts/pipelines/apiHooks/usePipelineRunJobs';
import usePipelineRuns from '~/concepts/pipelines/apiHooks/usePipelineRuns';
import { CreatePipelineServerButton, usePipelinesAPI } from '~/concepts/pipelines/context';
import useExperiments from '~/concepts/pipelines/apiHooks/useExperiments';
import usePipelines from '~/concepts/pipelines/apiHooks/usePipelines';
import PipelineImportModal from '~/concepts/pipelines/content/import/PipelineImportModal';
import emptyStateImg from '~/images/empty-state-pipelines.svg';

const PipelineExistsMetricsCard: React.FC = () => {
  const navigate = useNavigate();
  const { pipelinesServer, refreshAllAPI } = usePipelinesAPI();
  const [queryParams, setQueryParams] = useSearchParams();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [allowCreate] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });
  const [showImport, setShowImport] = React.useState<boolean>(false);

  const [{ totalSize: pipelinesCount }, pipelinesLoaded, pipelinesError] = usePipelines({
    pageSize: 1,
  });
  const [{ totalSize: triggeredCount }, triggeredLoaded, triggeredError] = usePipelineRuns({
    pageSize: 1,
  });
  const [{ totalSize: scheduledCount }, scheduledLoaded, scheduledError] = usePipelineRunJobs({
    pageSize: 1,
  });
  const [{ totalSize: experimentsCount }, experimentsLoaded, experimentsError] = useExperiments({
    pageSize: 1,
  });

  const loaded = pipelinesLoaded && triggeredLoaded && scheduledLoaded && experimentsLoaded;
  const loadError = pipelinesError || triggeredError || scheduledError || experimentsError;

  const statistics = React.useMemo(
    () => [
      {
        count: pipelinesCount,
        text: pipelinesCount === 1 ? 'Pipeline' : 'Pipelines',
        onClick: () => {
          queryParams.set('section', 'pipelines');
          setQueryParams(queryParams);
        },
      },
      {
        count: scheduledCount,
        text: scheduledCount === 1 ? 'Scheduled job' : 'Scheduled jobs',
        onClick: () => {
          queryParams.set('section', 'pipelines');
          setQueryParams(queryParams);
        },
      },
      {
        count: triggeredCount,
        text: triggeredCount === 1 ? 'Triggered job' : 'Triggered jobs',
        onClick: () => {
          queryParams.set('section', 'pipelines');
          setQueryParams(queryParams);
        },
      },
      {
        count: experimentsCount,
        text: experimentsCount === 1 ? 'Experiment' : 'Experiments',
        onClick: () => {
          queryParams.set('section', 'pipelines');
          setQueryParams(queryParams);
        },
      },
    ],
    [queryParams, setQueryParams, experimentsCount, pipelinesCount, scheduledCount, triggeredCount],
  );

  return (
    <>
      <MetricsCard
        loading={!loaded}
        loadError={loadError}
        title="Pipelines"
        imgSrc={pipelineImg}
        imgAlt="Pipelines"
        allowCreate={allowCreate}
        createButton={!pipelinesServer.installed && <CreatePipelineServerButton variant="link" />}
        onCreate={() => navigate(`/projects/${currentProject.metadata.name}/spawner`)}
        createText={pipelinesServer.installed ? 'Import pipeline' : 'Create pipeline'}
        typeModifier="pipeline"
        statistics={statistics}
      />
      <PipelineImportModal
        isOpen={showImport}
        onClose={(pipeline) => {
          setShowImport(false);
          if (pipeline) {
            refreshAllAPI();
          }
        }}
      />
    </>
  );
};

const PipelineMetricsCard: React.FC = () => {
  const { pipelinesServer } = usePipelinesAPI();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [allowCreate] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });
  if (pipelinesServer.installed) {
    return <PipelineExistsMetricsCard />;
  }

  return (
    <div className="odh-project-overview__metric-card pipeline">
      <div className="odh-project-overview__metric-card--empty-state">
        <div className="odh-project-overview__metric-card--title-icon">
          <img src={pipelineImg} alt="Pipelines" />
        </div>
        {allowCreate ? <CreatePipelineServerButton variant={ButtonVariant.link} isInline /> : null}
        <div className="odh-project-overview__metric-card--empty-state-content">
          <img src={emptyStateImg} alt="Pipelines" />
          <div>Start by creating a pipeline</div>
        </div>
      </div>
    </div>
  );
};

export default PipelineMetricsCard;
