import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';
import DetailsSection from './DetailsSection';
import { ProjectSectionID, ProjectSectionTitle } from './types';

const StorageList: React.FC = () => {
  return (
    <DetailsSection
      id={ProjectSectionID.STORAGE}
      title={ProjectSectionTitle.STORAGE}
      actions={[
        <Button key={`action-${ProjectSectionID.STORAGE}`} variant="secondary">
          Add storage
        </Button>,
      ]}
    >
      <EmptyDetailsList
        title="No storage"
        description="Choose existing, or add new on cluster storage."
      />
    </DetailsSection>
  );
};

export default StorageList;
