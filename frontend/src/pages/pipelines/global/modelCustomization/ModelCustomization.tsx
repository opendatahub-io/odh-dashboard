import * as React from 'react';
import {
  Accordion,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  ContentVariants,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Grid,
  GridItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { ModelCustomizationAccordionItem } from '~/pages/pipelines/global/modelCustomization/ModelCustomizationAccordionItem';
import { ModelRegistries } from '~/pages/pipelines/global/modelCustomization/ModelRegistries';
import ModelCustomizationDrawerContent, {
  ModelCustomizationDrawerContentArgs,
  ModelCustomizationDrawerContentRef,
} from '~/pages/pipelines/global/modelCustomization/ModelCustomizationDrawerContent';

const title = 'Model Customization';
const description =
  'Fine-tune your models to improve its performance, accuracy, and task specialization, using fine-tuning tools like InstructLab.';

const ModelCustomization: React.FC = () => {
  const navigate = useNavigate();
  const drawerContentRef = React.useRef<ModelCustomizationDrawerContentRef>(null);
  const [accordionItemsExpanded, setAccordionItemsExpanded] = React.useState<string[]>([]);
  const [isDrawerExpanded, setIsDrawerExpanded] = React.useState(false);

  const handleToggleAccordion = (itemId: string) => {
    setAccordionItemsExpanded((previousState) =>
      previousState.includes(itemId)
        ? previousState.filter((id) => id !== itemId)
        : [...previousState, itemId],
    );
  };

  const handleCloseDrawer = () => {
    setIsDrawerExpanded(false);
  };

  const handleOpenDrawer = (contentArgs: ModelCustomizationDrawerContentArgs) => {
    drawerContentRef.current?.update(contentArgs);
    setIsDrawerExpanded(true);
  };

  return (
    <Drawer isExpanded={isDrawerExpanded} data-testid="drawer-model-customization">
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
            description={description}
            loaded
            empty={false}
          >
            <Grid hasGutter>
              <GridItem>
                <Card>
                  <CardTitle>Fine-tuning with InstructLab</CardTitle>
                  <CardBody>
                    <Stack hasGutter>
                      <StackItem>
                        {`InstructLab is an open source AI community project that enables collaborative
                          fine-tuning of open source Granite LLMs. / InstructLab is an AI tool that enables
                          the fine-tuning of LLMs. In ${ODH_PRODUCT_NAME}, you can use InstructLab to fine-tune
                          Granite base models.`}
                      </StackItem>
                      <StackItem>
                        <Content component={ContentVariants.p} style={{ fontWeight: 'bold' }}>
                          Prerequisites for fine-tuning:
                        </Content>
                        <Accordion togglePosition="start" data-testid="accordion-prerequisites">
                          <ModelCustomizationAccordionItem
                            id="taxonomy"
                            title="Taxonomy"
                            itemsExpanded={accordionItemsExpanded}
                            handleToggle={handleToggleAccordion}
                          >
                            <Stack>
                              <StackItem>
                                {/* TODO: Replace with the correct text once available */}
                                Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do
                                eiusmod tempor incididunt ut labore et dolore magna aliqua.
                              </StackItem>
                              <StackItem>
                                <Button
                                  data-testid="learn-more-taxonomy"
                                  variant="link"
                                  onClick={() => {
                                    handleOpenDrawer({
                                      title: 'Taxonomy',
                                      description: 'Panel description',
                                      body: 'Content',
                                    });
                                  }}
                                >
                                  Learn more
                                </Button>
                              </StackItem>
                            </Stack>
                          </ModelCustomizationAccordionItem>
                          <ModelCustomizationAccordionItem
                            id="teacher-and-judge"
                            title="Deployed teacher and judge models"
                            itemsExpanded={accordionItemsExpanded}
                            handleToggle={handleToggleAccordion}
                          >
                            <Stack>
                              <StackItem>
                                The InstructLab fine-tuning method requires the deployment of a
                                teacher and judge model. Teacher models provide exemplary outputs,
                                and judge models compare those outputs to those of the model being
                                fine-tuned.
                              </StackItem>
                              <StackItem>
                                <Button
                                  data-testid="learn-more-teacher-and-judge"
                                  variant="link"
                                  onClick={() => {
                                    handleOpenDrawer({
                                      title: 'Deployed teacher and judge models',
                                      description: 'Panel description',
                                      body: 'Content',
                                    });
                                  }}
                                >
                                  Learn more
                                </Button>
                              </StackItem>
                            </Stack>
                          </ModelCustomizationAccordionItem>
                          <ModelCustomizationAccordionItem
                            id="pipeline-server"
                            title="A project with a configured pipeline server"
                            itemsExpanded={accordionItemsExpanded}
                            handleToggle={handleToggleAccordion}
                          >
                            <Stack>
                              <StackItem>
                                The fine-tuning process will create a pipeline run in a selected
                                project. If you don&apos;t have access to a project with a
                                configured pipeline server, contact your administrator.
                              </StackItem>
                              <StackItem>
                                <Button
                                  data-testid="go-to-projects"
                                  variant="link"
                                  onClick={() => navigate('/projects')}
                                >
                                  Go to Projects
                                </Button>
                              </StackItem>
                            </Stack>
                          </ModelCustomizationAccordionItem>
                          <ModelCustomizationAccordionItem
                            id="oci-storage"
                            title="A Granite model in a registry with OCI storage"
                            itemsExpanded={accordionItemsExpanded}
                            handleToggle={handleToggleAccordion}
                          >
                            <Stack>
                              <StackItem>
                                <Content component="p">
                                  <Stack>
                                    <StackItem>
                                      {`${ODH_PRODUCT_NAME} supports the fine-tuning of Granite models,
                                       which are available in the model catalog. Create a Granite base model,
                                       and register it to a model registry that has OCI storage.`}
                                    </StackItem>
                                    <StackItem>
                                      <Button
                                        data-testid="check-access"
                                        variant="link"
                                        isInline
                                        component="a"
                                        style={{ textDecoration: 'none' }}
                                        onClick={() => {
                                          handleOpenDrawer({
                                            title: 'Model registries',
                                            description: 'Panel description',
                                            body: <ModelRegistries />,
                                          });
                                        }}
                                      >
                                        Check your access
                                      </Button>
                                      , if you don&apos;t have access to model registry, or
                                      don&apos;t have access to a registry with OCI storage, contact
                                      your administrator.
                                    </StackItem>
                                  </Stack>
                                </Content>
                              </StackItem>
                              <StackItem>
                                <Button
                                  data-testid="go-to-model-catalog"
                                  variant="link"
                                  onClick={() => navigate('/modelCatalog')}
                                >
                                  Go to model catalog
                                </Button>
                              </StackItem>
                            </Stack>
                          </ModelCustomizationAccordionItem>
                        </Accordion>
                      </StackItem>
                      <StackItem>
                        <Button data-testid="fine-tune-from-model-catalog">
                          Fine-tune from the model catalog
                        </Button>
                      </StackItem>
                    </Stack>
                  </CardBody>
                </Card>
              </GridItem>
              <GridItem span={6}>
                <Card>
                  <CardTitle>What is InstructLab</CardTitle>
                  <CardBody>
                    InstructLab is an open source AI community project that enables collaborative
                    fine-tuning of open source Granite LLMs. / InstructLab is an AI tool that
                    enables the fine-tuning of LLMs.
                  </CardBody>
                </Card>
              </GridItem>
              <GridItem span={6}>
                <Card>
                  <CardTitle>Create a fine-tuning pipeline</CardTitle>
                  <CardBody>
                    <Stack hasGutter>
                      <StackItem>
                        {/* TODO: Replace with the correct text once available */}
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
                        tempor incididunt ut labore et dolore magna aliqua.
                      </StackItem>
                      <StackItem>
                        <Button
                          data-testid="go-to-pipelines"
                          variant="link"
                          onClick={() => navigate('/pipelines')}
                        >
                          Go to pipelines
                        </Button>
                      </StackItem>
                    </Stack>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </ApplicationsPage>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default ModelCustomization;
