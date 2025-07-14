import * as React from 'react';
import { Bullseye, EmptyState, PageSection, PageSectionVariants } from '@patternfly/react-core';
import { HomeIcon } from '@patternfly/react-icons';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '#~/concepts/areas';
import ModelCatalogSection from '#~/pages/home/modelCatalog/ModelCatalogSection';
import ProjectsSection from './projects/ProjectsSection';
import { useAIFlows } from './aiFlows/useAIFlows';
import { useResourcesSection } from './resources/useResourcesSection';
import { useEnableTeamSection } from './useEnableTeamSection';
import LandingPageHomeHint from './LandingPageHomeHint';

const Home: React.FC = () => {
  const { status: projectsAvailable } = useIsAreaAvailable(SupportedArea.DS_PROJECTS_VIEW);
  const { status: modelCatalogAvailable } = useIsAreaAvailable(SupportedArea.MODEL_CATALOG);
  const aiFlows = useAIFlows();
  const resourcesSection = useResourcesSection();
  const enableTeamSection = useEnableTeamSection();

  return (
    <div data-testid="home-page">
      <LandingPageHomeHint />
      {!projectsAvailable &&
      !modelCatalogAvailable &&
      !aiFlows &&
      !resourcesSection &&
      !enableTeamSection ? (
        <PageSection
          hasBodyWrapper={false}
          data-testid="home-page-empty"
          variant={PageSectionVariants.default}
        >
          <Bullseye>
            <EmptyState
              headingLevel="h4"
              icon={HomeIcon}
              titleText={`Welcome to ${ODH_PRODUCT_NAME}`}
              variant="full"
            />
          </Bullseye>
        </PageSection>
      ) : (
        <>
          <ProjectsSection />
          <ModelCatalogSection />
          {aiFlows}
          {resourcesSection}
          {enableTeamSection}
        </>
      )}
    </div>
  );
};

export default Home;
