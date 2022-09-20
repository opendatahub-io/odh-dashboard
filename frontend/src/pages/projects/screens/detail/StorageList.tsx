import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';
import DetailsSection from './DetailsSection';
import { ProjectSectionID } from './types';
import { ProjectSectionTitles } from './const';

const StorageList: React.FC = () => {
  return (
    <DetailsSection
      id={ProjectSectionID.STORAGE}
      title={ProjectSectionTitles[ProjectSectionID.STORAGE]}
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
