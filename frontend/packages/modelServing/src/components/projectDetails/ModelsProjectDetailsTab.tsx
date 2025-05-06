import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import DetailsSection from '@odh-dashboard/internal/pages/projects/screens/detail/DetailsSection';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { EmptyModelServingView } from './EmptyModelServingView';

const ModelsProjectDetailsTab: React.FC = () => {
  const models = [];

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.MODEL_SERVER}
        title="Models"
        isLoading={false}
        isEmpty={models.length === 0}
        emptyState={<EmptyModelServingView />}
      >
        <>Model tab content. Platform selection, and view models table</>
      </DetailsSection>
    </>
  );
};

export default ModelsProjectDetailsTab;
