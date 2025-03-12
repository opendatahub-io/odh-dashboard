import * as React from 'react';
import { Accordion } from '@patternfly/react-core';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { ModelCustomizationAccordionItem } from '~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationAccordionItem';
import { BaseSection } from '~/pages/pipelines/global/modelCustomization/landingPage/BaseSection';
import { useToggleAccordtion } from '~/pages/pipelines/global/modelCustomization/landingPage/useToggleAccordion';

export const PrerequisitesSection: React.FC = () => {
  const { accordionItemsExpanded, handleToggleAccordion } = useToggleAccordtion();

  return (
    <BaseSection title="To get started, you'll need the following prerequisites:">
      <Accordion togglePosition="start" data-testid="accordion-prerequisites">
        <ModelCustomizationAccordionItem
          id="taxonomy-repository"
          title="Taxonomy repository"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          Provide a git repository link to a taxonomy repository, which must be formatted in a
          cascading file structure. A LAB-tuning taxonomy contains two types of data: skills, which
          enable the model to complete performative actions; and knowledge, which enables the model
          to answer questions that involve facts, data, or references.
        </ModelCustomizationAccordionItem>
        <ModelCustomizationAccordionItem
          id="deployed-teacher-and-judge-models"
          title="Deployed teacher and judge models"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          The teacher model is responsible for the creation of synthetic data. The judge model is
          responsible for evaluating the LAB-tuning run.
        </ModelCustomizationAccordionItem>
        <ModelCustomizationAccordionItem
          id="open-container-initiative-storage-location"
          title="Open Container Initiative (OCI) storage location"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          {`An OCI storage location is required to store the LAB-tuned model.
            Ensure that the storage location has enough room to store the model output. 
            This storage location can be reused via a connection within ${ODH_PRODUCT_NAME}.`}
        </ModelCustomizationAccordionItem>
      </Accordion>
    </BaseSection>
  );
};
