import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import DetailsSection from '@odh-dashboard/internal/pages/projects/screens/detail/DetailsSection';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { EmptyModelServingView } from './EmptyModelServingView';
import { ProjectModelsProvider, ProjectModelsContext } from '../../ProjectModelsContext';

const ModelsProjectDetailsTab: React.FC = () => {
  const { project, models } = React.useContext(ProjectModelsContext);

  const isLoading = !project || !models;

  return (
    <>
      <DetailsSection
        id={ProjectSectionID.MODEL_SERVER}
        title="Models"
        isLoading={isLoading}
        isEmpty={models.length === 0}
        emptyState={!isLoading && <EmptyModelServingView project={project} />}
      >
        <>Vew models table</>
      </DetailsSection>
    </>
  );
};

const WithContext: React.FC = () => (
  <ProjectModelsProvider>
    <ModelsProjectDetailsTab />
  </ProjectModelsProvider>
);

export default WithContext;
