import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';
import { ProjectSectionID } from './types';
import DetailsSection from './DetailsSection';
import { ProjectSectionTitles } from './const';

const DataConnectionsList: React.FC = () => {
  return (
    <DetailsSection
      id={ProjectSectionID.DATA_CONNECTIONS}
      title={ProjectSectionTitles[ProjectSectionID.DATA_CONNECTIONS]}
      actions={[
        <Button key={`action-${ProjectSectionID.DATA_CONNECTIONS}`} variant="secondary">
          Add data connection
        </Button>,
      ]}
      isLoading={false}
      isEmpty
      loadError={undefined}
      emptyState={
        <EmptyDetailsList
          title="No data connections"
          description="To get started, add data to your project."
        />
      }
    >
      No content
    </DetailsSection>
  );
};

export default DataConnectionsList;
