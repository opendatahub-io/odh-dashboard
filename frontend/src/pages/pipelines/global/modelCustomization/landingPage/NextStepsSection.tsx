import * as React from 'react';
import { Link } from 'react-router-dom';
import { Accordion, Label, Title } from '@patternfly/react-core';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { ModelCustomizationAccordionItem } from '~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationAccordionItem';
import { BaseSection } from '~/pages/pipelines/global/modelCustomization/landingPage/BaseSection';
import { useToggleAccordion } from '~/pages/pipelines/global/modelCustomization/landingPage/useToggleAccordion';
import { pipelineRunsRootPath } from '~/routes/pipelines/runs';
import { modelCatalogRoute } from '~/routes/modelCatalog/catalogModelDetails';

export const NextStepsSection: React.FC = () => {
  const { accordionItemsExpanded, handleToggleAccordion } = useToggleAccordion();

  return (
    <BaseSection title={<Title headingLevel="h3">Now that you&#39;re all set up:</Title>}>
      <Accordion togglePosition="start" data-testid="accordion-next-steps">
        <ModelCustomizationAccordionItem
          id="register-base-model"
          title="Register a base model"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          Select a base model from the <Link to={modelCatalogRoute}>Model catalog page</Link> and
          register it to an {ODH_PRODUCT_NAME} model registry.
          <br />
          Note: You can choose any base model, but {ODH_PRODUCT_NAME} currently supports LAB-tuning
          for only Granite models with the{' '}
          <Label isCompact color="yellow">
            LAB starter
          </Label>{' '}
          label
        </ModelCustomizationAccordionItem>
        <ModelCustomizationAccordionItem
          id="create-lab-tuning-run"
          title="Create a LAB-tuning run"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          On the registered model details page, click <b>LAB-tune</b>. Enter details such as the
          resources that will be utilized, hyper-parameters, and the location where the fine-tuned
          model will be stored. When complete, click <b>Start run</b>.
        </ModelCustomizationAccordionItem>
        <ModelCustomizationAccordionItem
          id="monitor-run"
          title="Monitor your run"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          The LAB-tuning run can take some time to finish. To monitor the status of your run, go to
          the{' '}
          <Link data-testid="go-to-pipeline-runs" to={pipelineRunsRootPath}>
            Runs page
          </Link>
          .
        </ModelCustomizationAccordionItem>
        <ModelCustomizationAccordionItem
          id="view-model"
          title="View the LAB-tuned model"
          itemsExpanded={accordionItemsExpanded}
          handleToggle={handleToggleAccordion}
        >
          When the pipeline run is finished, your LAB-tuned model will be available in your
          specified output location. If you registered it in an {ODH_PRODUCT_NAME} model registry,
          the tuned model will be output as a new version of the base model. View it nested under
          the base model on the{' '}
          <Link data-testid="go-to-model-registry" to="/modelRegistry">
            Model registry page
          </Link>
          .
        </ModelCustomizationAccordionItem>
      </Accordion>
    </BaseSection>
  );
};
