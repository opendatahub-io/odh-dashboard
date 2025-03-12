import * as React from 'react';
import { Link } from 'react-router-dom';
import { Accordion } from '@patternfly/react-core';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { ModelCustomizationAccordionItem } from '~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationAccordionItem';
import { BaseSection } from '~/pages/pipelines/global/modelCustomization/landingPage/BaseSection';
import { useToggleAccordion } from '~/pages/pipelines/global/modelCustomization/landingPage/useToggleAccordion';
import { pipelinesRootPath } from '~/routes';

export const ProjectSetupSection: React.FC = () => {
  const { accordionItemsExpanded, handleToggleAccordion } = useToggleAccordion();

  return (
    <BaseSection title="Setting up your project pipeline:">
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
            Pipelines page
          </Link>
          .
        </ModelCustomizationAccordionItem>
        <ModelCustomizationAccordionItem
          id="hardware-profiles"
          title="Hardware profiles"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          Hardware profiles are necessary for picking the hardware resources you want to allocate
          for the LAB-tuning run. For help, contact your {ODH_PRODUCT_NAME} administrator.
        </ModelCustomizationAccordionItem>
      </Accordion>
    </BaseSection>
  );
};
