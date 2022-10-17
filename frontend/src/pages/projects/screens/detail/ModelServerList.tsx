import * as React from 'react';
import { Button } from '@patternfly/react-core';
import EmptyDetailsList from './EmptyDetailsList';
import DetailsSection from './DetailsSection';
import { ProjectSectionTitlesExtended } from './const';
import { ProjectSectionID } from './types';
import { PlusCircleIcon } from '@patternfly/react-icons';

const ModelServerList: React.FC = () => {
  return (
    <DetailsSection
      id={ProjectSectionID.MODEL_SERVER}
      title={ProjectSectionTitlesExtended[ProjectSectionID.MODEL_SERVER] || ''}
      actions={[
        <Button key={`action-${ProjectSectionID.MODEL_SERVER}`} variant="secondary">
          Configure server
        </Button>,
      ]}
      isLoading={false}
      isEmpty
      loadError={undefined}
      emptyState={
        <EmptyDetailsList
          title="No model servers"
          description="Before deploying a model, you must first configure a model server."
          icon={PlusCircleIcon}
        />
      }
    >
      No content
    </DetailsSection>
  );
};

export default ModelServerList;
