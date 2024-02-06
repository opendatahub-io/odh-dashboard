import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import notebookImg from '~/images/UI_icon-Red_Hat-Wrench-RGB.svg';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import { AccessReviewResource } from '~/pages/projects/screens/detail/const';
import MetricsCard from '~/pages/projects/screens/detail/overview/MetricsCard';

const NotebookMetricsCard: React.FC = () => {
  const navigate = useNavigate();
  const [queryParams, setQueryParams] = useSearchParams();
  const {
    currentProject,
    notebooks: { data: notebooks, loaded, error },
  } = React.useContext(ProjectDetailsContext);
  const [allowCreate] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

  const statistics = React.useMemo(
    () => [
      {
        count: notebooks.filter((n) => n.isStopped).length,
        text: 'Stopped',
        onClick: () => {
          queryParams.set('section', 'workbenches');
          setQueryParams(queryParams);
        },
      },
      {
        count: notebooks.filter((n) => n.isStarting).length,
        text: 'Starting',
        onClick: () => {
          queryParams.set('section', 'workbenches');
          setQueryParams(queryParams);
        },
      },
      {
        count: notebooks.filter((n) => n.isRunning).length,
        text: 'Running',
        onClick: () => {
          queryParams.set('section', 'workbenches');
          setQueryParams(queryParams);
        },
      },
    ],
    [notebooks, queryParams, setQueryParams],
  );

  return (
    <MetricsCard
      loading={!loaded}
      loadError={error}
      title="Workbenches"
      imgSrc={notebookImg}
      imgAlt="Workbenches"
      allowCreate={allowCreate}
      onCreate={() => navigate(`/projects/${currentProject.metadata.name}/spawner`)}
      createText="Create workbench"
      typeModifier="notebook"
      statistics={statistics}
    />
  );
};

export default NotebookMetricsCard;
