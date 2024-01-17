import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import EmptyComponentsCard from '~/pages/projects/screens/detail/EmptyComponentsCard';

type NotebookCardEmptyProps = {
  allowCreate: boolean;
};

const NotebookCardEmpty: React.FC<NotebookCardEmptyProps> = ({ allowCreate }) => {
  const navigate = useNavigate();
  const { currentProject } = React.useContext(ProjectDetailsContext);

  return (
    <EmptyComponentsCard
      allowCreate={allowCreate}
      description="Creating a workbench allows you to add a Jupyter notebook to your project."
      onAction={() => navigate(`/projects/${currentProject.metadata.name}/spawner`)}
      createText="Create workbench"
    />
  );
};

export default NotebookCardEmpty;
