import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';
import { ProjectSectionID, ProjectSectionTitle } from './types';
import DetailsSection from './DetailsSection';

const WorkspacesList: React.FC = () => {
  return (
    <DetailsSection
      id={ProjectSectionID.WORKSPACE}
      title={ProjectSectionTitle.WORKSPACE}
      actions={[
        <Button key={`action-${ProjectSectionID.WORKSPACE}`} variant="secondary">
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
