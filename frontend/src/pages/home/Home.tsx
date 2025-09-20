import * as React from 'react';
import { Bullseye, EmptyState, PageSection, PageSectionVariants } from '@patternfly/react-core';
import { HomeIcon } from '@patternfly/react-icons';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';
import { SupportedArea } from '#~/concepts/areas';
//import ModelCatalogSection from '#~/pages/home/modelCatalog/ModelCatalogSection';
import ProjectsSection from './projects/ProjectsSection';
import { useResourcesSection } from './resources/useResourcesSection';
import { useEnableTeamSection } from './useEnableTeamSection';

const Home: React.FC = () => {
  const { status: projectsAvailable } = useIsAreaAvailable(SupportedArea.DS_PROJECTS_VIEW);
  // TODO: Temporarily disabled model catalog section - to be re-enabled in future ==> https://issues.redhat.com/browse/RHOAIENG-34405
  // const { status: modelCatalogAvailable } = useIsAreaAvailable(SupportedArea.MODEL_CATALOG);
  const resourcesSection = useResourcesSection();
  const enableTeamSection = useEnableTeamSection();

  return (
    <div data-testid="home-page">
      {!projectsAvailable &&
      // !modelCatalogAvailable &&
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
          {/* TODO: Temporarily disabled model catalog section  https://issues.redhat.com/browse/RHOAIENG-34405 */}
          {/* <ModelCatalogSection /> */}
          {resourcesSection}
          {enableTeamSection}
        </>
      )}
    </div>
  );
};

export default Home;
