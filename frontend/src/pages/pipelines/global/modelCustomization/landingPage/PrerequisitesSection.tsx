import * as React from 'react';
import { Accordion, Button, Stack, StackItem } from '@patternfly/react-core';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { ModelCustomizationAccordionItem } from '~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationAccordionItem';
import { BaseSection } from '~/pages/pipelines/global/modelCustomization/landingPage/BaseSection';
import { useToggleAccordtion } from '~/pages/pipelines/global/modelCustomization/landingPage/useToggleAccordion';
import { ModelCustomizationDrawerContentArgs } from '~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent';

type PrerequisitesSectionProps = {
  handleOpenDrawer: (contentArgs: ModelCustomizationDrawerContentArgs) => void;
};

export const PrerequisitesSection: React.FC<PrerequisitesSectionProps> = ({ handleOpenDrawer }) => {
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
          <Stack>
            <StackItem>
              Provide a git repository link to a taxonomy repository, which must be formatted in a
              cascading file structure. A LAB-tuning taxonomy contains two types of data: skills,
              which enable the model to complete performative actions; and knowledge, which enables
              the model to answer questions that involve facts, data, or references.
            </StackItem>
            <StackItem>
              <Button
                data-testid="learn-more-taxonomy"
                variant="link"
                isInline
                component="a"
                onClick={() => {
                  handleOpenDrawer({
                    title: 'Learn how to construct and build a taxonomy repository',
                    description: 'Panel description',
                    body: 'Content',
                  });
                }}
              >
                Learn how to construct and build a taxonomy repository
              </Button>
            </StackItem>
          </Stack>
        </ModelCustomizationAccordionItem>
        <ModelCustomizationAccordionItem
          id="deployed-teacher-and-judge-models"
          title="Deployed teacher and judge models"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          <Stack>
            <StackItem>
              The teacher model is responsible for the creation of synthetic data. The judge model
              is responsible for evaluating the LAB-tuning run.
            </StackItem>
            <StackItem>
              <Button
                data-testid="learn-more-teacher-judge-models"
                variant="link"
                isInline
                component="a"
                onClick={() => {
                  handleOpenDrawer({
                    title: 'Learn how to find and deploy teacher and judge models',
                    description: 'Panel description',
                    body: 'Content',
                  });
                }}
              >
                Learn how to find and deploy teacher and judge models
              </Button>
            </StackItem>
          </Stack>
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
