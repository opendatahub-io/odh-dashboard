import * as React from 'react';
import { Accordion, Button, Title } from '@patternfly/react-core';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { ModelCustomizationAccordionItem } from '#~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationAccordionItem';
import { BaseSection } from '#~/pages/pipelines/global/modelCustomization/landingPage/BaseSection';
import { useToggleAccordion } from '#~/pages/pipelines/global/modelCustomization/landingPage/useToggleAccordion';
import { ModelCustomizationDrawerContentArgs } from '#~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent';
import MarkdownView from '#~/components/MarkdownView';
import {
  taxonomyMarkdownContent,
  taxonomyMarkdownTitle,
  teacherJudgeMarkdownContent,
  teacherJudgeMarkdownTitle,
} from '#~/pages/pipelines/global/modelCustomization/const';

type PrerequisitesSectionProps = {
  handleOpenDrawer: (contentArgs: ModelCustomizationDrawerContentArgs) => void;
};

export const PrerequisitesSection: React.FC<PrerequisitesSectionProps> = ({ handleOpenDrawer }) => {
  const { accordionItemsExpanded, handleToggleAccordion } = useToggleAccordion();

  return (
    <BaseSection
      title={
        <Title headingLevel="h3">
          To get started, you&#39;ll need the following prerequisites:
        </Title>
      }
    >
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
          <Button
            data-testid="learn-more-taxonomy"
            style={{ padding: 0 }}
            variant="link"
            onClick={() =>
              handleOpenDrawer({
                title: taxonomyMarkdownTitle,
                content: <MarkdownView markdown={taxonomyMarkdownContent} />,
              })
            }
          >
            Learn how to construct and build a taxonomy repository
          </Button>
        </ModelCustomizationAccordionItem>
        <ModelCustomizationAccordionItem
          id="deployed-teacher-and-judge-models"
          title="Deployed teacher and judge models"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          The teacher model is responsible for the creation of synthetic data. The judge model is
          responsible for evaluating the LAB-tuning run.
          <Button
            data-testid="learn-more-teacher-judge-models"
            style={{ padding: 0 }}
            variant="link"
            onClick={() =>
              handleOpenDrawer({
                title: teacherJudgeMarkdownTitle,
                content: <MarkdownView markdown={teacherJudgeMarkdownContent} />,
              })
            }
          >
            Learn how to find and deploy teacher and judge models
          </Button>
        </ModelCustomizationAccordionItem>
        <ModelCustomizationAccordionItem
          id="open-container-initiative-storage-location"
          title="Open Container Initiative (OCI) storage location"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          An OCI storage location is required to store the LAB-tuned model. Ensure that the storage
          location has enough room to store the model output. This storage location can be reused
          via a connection within {ODH_PRODUCT_NAME}.
        </ModelCustomizationAccordionItem>
      </Accordion>
    </BaseSection>
  );
};
