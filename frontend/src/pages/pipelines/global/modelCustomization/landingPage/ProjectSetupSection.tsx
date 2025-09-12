import * as React from 'react';
import { Link } from 'react-router-dom';
import { Accordion, Title } from '@patternfly/react-core';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { ModelCustomizationAccordionItem } from '#~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationAccordionItem';
import { BaseSection } from '#~/pages/pipelines/global/modelCustomization/landingPage/BaseSection';
import { useToggleAccordion } from '#~/pages/pipelines/global/modelCustomization/landingPage/useToggleAccordion';
import { pipelinesRootPath } from '#~/routes/pipelines/global';

export const ProjectSetupSection: React.FC = () => {
  const { accordionItemsExpanded, handleToggleAccordion } = useToggleAccordion();

  return (
    <BaseSection title={<Title headingLevel="h3">Next, set up your project and pipeline:</Title>}>
      <Accordion togglePosition="start" data-testid="accordion-project-setup">
        <ModelCustomizationAccordionItem
          id="prepared-project"
          title="Prepared project"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          The LAB-tuning run will take place within a selected project. Select a project to use, and
          ensure it has a configured pipeline server.
        </ModelCustomizationAccordionItem>
        <ModelCustomizationAccordionItem
          id="instructlab-pipeline"
          title="InstructLab pipeline"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          The InstructLab pipeline is the set steps and instructions that make up LAB-tuning runs.
          To install the InstructLab pipeline on your selected project, click{' '}
          <b>Manage preconfigured pipelines</b> on the{' '}
          <Link data-testid="go-to-pipelines" to={pipelinesRootPath}>
            Pipeline definitions page
          </Link>
          .
        </ModelCustomizationAccordionItem>
        <ModelCustomizationAccordionItem
          id="hardware-profiles"
          title="Hardware profiles"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          Allocate hardware resources to the LAB-tuning run using hardware profiles. For help,
          contact your {ODH_PRODUCT_NAME} administrator.
        </ModelCustomizationAccordionItem>
      </Accordion>
    </BaseSection>
  );
};
