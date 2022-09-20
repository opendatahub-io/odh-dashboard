import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';
import { ProjectSectionID, ProjectSectionTitle } from './types';
import DetailsSection from './DetailsSection';

const DataConnectionsList: React.FC = () => {
  return (
    <DetailsSection
      id={ProjectSectionID.DATA_CONNECTIONS}
      title={ProjectSectionTitle.DATA_CONNECTIONS}
      actions={[
        <Button key={`action-${ProjectSectionID.DATA_CONNECTIONS}`} variant="secondary">
          Add data connection
        </Button>,
      ]}
    >
      <EmptyDetailsList
        title="No data connections"
        description="To get started, add data to your project."
      />
    </DetailsSection>
  );
};

export default DataConnectionsList;
