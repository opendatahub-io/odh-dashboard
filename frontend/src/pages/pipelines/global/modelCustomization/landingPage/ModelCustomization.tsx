import * as React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { LabMethodDescriptionSection } from '#~/pages/pipelines/global/modelCustomization/landingPage/LabMethodDescriptionSection';
import ModelCustomizationDrawerContent, {
  ModelCustomizationDrawerContentArgs,
  ModelCustomizationDrawerContentRef,
} from '#~/pages/pipelines/global/modelCustomization/landingPage/ModelCustomizationDrawerContent';
import { NextStepsSection } from '#~/pages/pipelines/global/modelCustomization/landingPage/NextStepsSection';
import { PrerequisitesSection } from '#~/pages/pipelines/global/modelCustomization/landingPage/PrerequisitesSection';
import { ProjectSetupSection } from '#~/pages/pipelines/global/modelCustomization/landingPage/ProjectSetupSection';

const title = 'Model customization';
const description =
  'Optionally customize foundation models to adhere more to domain-specific capabilities, output formats, and styles, using the Large-scale Alignment for chatBots (LAB) method or your own fine-tuning workflow.';

const maxWidth = '485px';

const ModelCustomization: React.FC = () => {
  const drawerContentRef = React.useRef<ModelCustomizationDrawerContentRef>(null);
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);

  const handleCloseDrawer = () => {
    setIsDrawerExpanded(false);
  };

  const handleOpenDrawer = (contentArgs: ModelCustomizationDrawerContentArgs) => {
    drawerContentRef.current?.update(contentArgs);
    setIsDrawerExpanded(true);
  };

  return (
    <Drawer isExpanded={isDrawerExpanded} data-testid="drawer-model-customization" isInline>
      <DrawerContent
        panelContent={
          <ModelCustomizationDrawerContent
            ref={drawerContentRef}
            handleCloseDrawer={handleCloseDrawer}
          />
        }
      >
        <DrawerContentBody>
          <ApplicationsPage
            title={
              <TitleWithIcon title={title} objectType={ProjectObjectType.modelCustomization} />
            }
            provideChildrenPadding
            description={<div style={{ maxWidth }}>{description}</div>}
            loaded
            empty={false}
          >
            <Card>
              <CardTitle>
                <TitleWithIcon
                  title={<Title headingLevel="h2">LAB-tuning</Title>}
                  objectType={ProjectObjectType.labTuning}
                />
              </CardTitle>
              <CardBody style={{ maxWidth }}>
                <Stack hasGutter>
                  <StackItem>
                    LAB-tuning significantly reduces limitations associated with traditional
                    fine-tuning methods, such as high resource usage and time-consuming manual data
                    generation. The LAB method can enhance an LLM using far less human-generated
                    information and fewer computing resources than are usually required to retrain a
                    model.
                  </StackItem>
                  <StackItem>
                    <LabMethodDescriptionSection />
                  </StackItem>
                  <StackItem>
                    <PrerequisitesSection handleOpenDrawer={handleOpenDrawer} />
                  </StackItem>
                  <StackItem>
                    <ProjectSetupSection />
                  </StackItem>
                  <StackItem>
                    <NextStepsSection />
                  </StackItem>
                </Stack>
              </CardBody>
            </Card>
          </ApplicationsPage>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default ModelCustomization;
