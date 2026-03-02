import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Label,
  Panel,
  PanelMain,
  PanelMainBody,
  PanelFooter,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';
import createConfigureSchema from '~/app/schemas/configure.schema';
import { autoragResultsPathname } from '~/app/utilities/routes';
import { useLlamaStackModelsQuery } from '~/app/hooks/queries';
import FileExplorer from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import AutoragExperimentSettings from './AutoragExperimentSettings';

function AutoragConfigure(): React.JSX.Element {
  const navigate = useNavigate();
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState<boolean>(false);
  const [isExperimentSettingsOpen, setIsExperimentSettingsOpen] = useState<boolean>(false);

  const { data: allModelsData } = useLlamaStackModelsQuery();
  const modelsInitialized = useRef(false);

  const configureSchema = createConfigureSchema();
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema),
    defaultValues: configureSchema.parse({}),
  });

  useEffect(() => {
    //Initialize available generation and embedding models into the form data
    if (allModelsData?.models && !modelsInitialized.current) {
      modelsInitialized.current = true;
      form.reset({
        ...form.getValues(),
        // eslint-disable-next-line camelcase
        generation_constraints: allModelsData.models
          .filter((model) => model.type === 'llm')
          .map((model) => ({ model: model.id })),
        // eslint-disable-next-line camelcase
        embeddings_constraints: allModelsData.models
          .filter((model) => model.type === 'embedding')
          .map((model) => ({ model: model.id })),
      });
    }
  }, [allModelsData, form]);

  const saveExperimentSettingsChanges = () => {
    // TODO: add form update logic once ready
    setIsExperimentSettingsOpen(false);
  };

  return (
    <FormProvider {...form}>
      <Panel isScrollable={false}>
        <PanelMain tabIndex={0}>
          <PanelMainBody>
            <Grid hasGutter>
              <GridItem span={4}>
                <Card className="pf-v6-u-h-100">
                  <CardTitle>Documents</CardTitle>
                  <CardBody>
                    <Stack>
                      <StackItem className="pf-v6-u-font-size-sm pf-v6-u-mb-sm">
                        Select or add an S3 connection to upload files or browse existing files.
                      </StackItem>
                      <StackItem>
                        <Split>
                          <SplitItem isFilled data-temp-placeholder>
                            Connections dropdown
                          </SplitItem>
                          <SplitItem>
                            <Button
                              key="add-new-connection"
                              variant="secondary"
                              onClick={() => null}
                            >
                              Add new connection
                            </Button>
                          </SplitItem>
                        </Split>
                      </StackItem>

                      <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                        Selected connection
                      </StackItem>
                      <StackItem>
                        <Label onClose={() => null}>S3 connection test</Label>
                      </StackItem>

                      <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                        Selected files
                      </StackItem>
                      <StackItem>
                        <Button
                          key="select-files"
                          variant="secondary"
                          onClick={() => setIsFileExplorerOpen(true)}
                        >
                          Select files
                        </Button>
                      </StackItem>
                    </Stack>
                  </CardBody>
                </Card>
              </GridItem>
              <GridItem span={8}>
                <Card className="pf-v6-u-h-100">
                  <CardTitle>Configure details</CardTitle>
                  <CardBody>
                    <Stack>
                      <StackItem className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
                        Where would you like to index your documents?
                      </StackItem>
                      <StackItem data-temp-placeholder>Vector index dropdown</StackItem>

                      <StackItem className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm pf-v6-u-mt-md">
                        Add the data source you would like to use for evaluation.{' '}
                        <span className="pf-v6-u-text-color-required">*</span>
                      </StackItem>
                      <StackItem data-temp-placeholder>
                        Evaluation data source upload component
                      </StackItem>

                      <Grid hasGutter className="pf-v6-u-mt-md">
                        <GridItem span={6}>
                          <Card>
                            <CardHeader
                              hasWrap
                              actions={{
                                actions: [
                                  <Button
                                    key="edit-optimization-metric"
                                    variant="secondary"
                                    onClick={() => setIsExperimentSettingsOpen(true)}
                                  >
                                    Edit
                                  </Button>,
                                ],
                              }}
                            >
                              <CardTitle>Optimization metric</CardTitle>
                            </CardHeader>
                            <CardBody />
                          </Card>
                        </GridItem>
                        <GridItem span={6}>
                          <Card>
                            <CardHeader
                              hasWrap
                              actions={{
                                actions: [
                                  <Button
                                    key="edit-considered-models"
                                    variant="secondary"
                                    onClick={() => setIsExperimentSettingsOpen(true)}
                                  >
                                    Edit
                                  </Button>,
                                ],
                              }}
                            >
                              <CardTitle>Models to consider</CardTitle>
                            </CardHeader>
                            <CardBody />
                          </Card>
                        </GridItem>
                      </Grid>
                    </Stack>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </PanelMainBody>
        </PanelMain>
        <PanelFooter>
          <Button
            variant="primary"
            onClick={() => {
              navigate(`${autoragResultsPathname}/FAKE_RUN_ID`);
            }}
          >
            Run experiment
          </Button>
        </PanelFooter>
      </Panel>

      <FileExplorer
        id="AutoRagConfigure-FileExplorer"
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
        onSelect={(files) => null /* eslint-disable-line @typescript-eslint/no-unused-vars */}
      />
      <AutoragExperimentSettings
        isOpen={isExperimentSettingsOpen}
        onClose={() => setIsExperimentSettingsOpen(false)}
        revertChanges={() => {
          //TODO: Add proper form snapshotting logic for a baseline to reset the experiment settings to
          //once more of the configure form flow is clarified and developed
          setIsExperimentSettingsOpen(false);
        }}
        saveChanges={saveExperimentSettingsChanges}
      />
    </FormProvider>
  );
}

export default AutoragConfigure;
