import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { pluralize } from '@patternfly/react-core';
import emptyStateImg from '~/images/UI_icon-Red_Hat-Wrench-RGB.svg';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import OverviewCard from './OverviewCard';

type NotebookCardProps = {
  allowCreate: boolean;
};

const NotebookCard: React.FC<NotebookCardProps> = ({ allowCreate }) => {
  const navigate = useNavigate();
  const {
    currentProject,
    notebooks: { data: notebooks, loaded, error },
  } = React.useContext(ProjectDetailsContext);

  return (
    <OverviewCard
      loading={!loaded}
      loadError={error}
      count={notebooks.length}
      title={pluralize(notebooks.length, 'Workbench', 'Workbenches')}
      description="Add a Jupyter notebook to your project."
      imgSrc={emptyStateImg}
      imgAlt="Workbenches"
      allowCreate={allowCreate}
      onAction={() => navigate(`/projects/${currentProject.metadata.name}/spawner`)}
      createText="Create workbench"
      typeModifier="notebook"
      navSection="workbenches"
    />
  );
};

export default NotebookCard;
