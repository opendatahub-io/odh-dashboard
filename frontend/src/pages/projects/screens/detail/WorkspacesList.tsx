import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';
import { ProjectSectionID } from './types';
import DetailsSection from './DetailsSection';
import { ProjectSectionTitles } from './const';
import { ProjectDetailsContext } from '../../ProjectDetailsContext';
import { useNavigate } from 'react-router-dom';

const WorkspacesList: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const projectName = currentProject.metadata.name;
  return (
    <DetailsSection
      id={ProjectSectionID.WORKSPACE}
      title={ProjectSectionTitles[ProjectSectionID.WORKSPACE]}
      actions={[
        <Button
          key={`action-${ProjectSectionID.WORKSPACE}`}
          variant="secondary"
          onClick={() => navigate(`/projects/${projectName}/spawner`)}
        >
          Create data science workspace
        </Button>,
      ]}
    >
      <EmptyDetailsList
        title="No data science workspaces"
        description="To get started, create a data science workspace."
      />
    </DetailsSection>
  );
};

export default WorkspacesList;
