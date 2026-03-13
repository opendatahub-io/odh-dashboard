import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  isConnectionType,
  isConnectionTypeDataField,
  S3ConnectionTypeKeys,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Flex,
  Grid,
  GridItem,
  Label,
  List,
  ListItem,
  Popover,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { findKey } from 'es-toolkit';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useFormContext, useWatch, Watch } from 'react-hook-form';
import { Navigate, useParams } from 'react-router';
import AutoragConnectionModal from '~/app/components/common/AutoragConnectionModal';
import FileExplorer from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import SecretSelector, { SecretSelection } from '~/app/components/common/SecretSelector';
import { useLlamaStackModelsQuery } from '~/app/hooks/queries';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import { SecretListItem } from '~/app/types';
import { autoragExperimentsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import AutoragExperimentSettings from './AutoragExperimentSettings';

const AUTORAG_REQUIRED_KEYS: { [type: string]: string[] } = { s3: ['aws_s3_bucket'] };

function AutoragConfigure(): React.JSX.Element {
  const { namespace } = useParams();
  const [allConnectionTypes] = useWatchConnectionTypes();
  const autoragConnectionTypes = React.useMemo(
    () =>
      allConnectionTypes.filter((ct) => {
        if (!isConnectionType(ct)) {
          return false;
        }
        const fieldEnvs = ct.data?.fields?.map((f) => isConnectionTypeDataField(f) && f.envVar);
        return S3ConnectionTypeKeys.every((envVar) => fieldEnvs?.includes(envVar));
      }),
    [allConnectionTypes],
  );
  const [isConnectionModalOpen, setIsConnectionModalOpen] = React.useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState<boolean>(false);
  const [isExperimentSettingsOpen, setIsExperimentSettingsOpen] = useState<boolean>(false);
  const [selectedSecret, setSelectedSecret] = useState<SecretSelection | undefined>();
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);
  const modelsInitialized = useRef(false);
  // TODO: secretName should come from a react-hook-form field. Once it's implemented,
  // add secretName as a parameter into useLlamaStackModelsQuery
  const { data: allModelsData } = useLlamaStackModelsQuery(String(namespace), undefined);

  const form = useFormContext<ConfigureSchema>();

  const [inputDataBucketName, testDataBucketName] = useWatch({
    control: form.control,
    name: ['input_data_bucket_name', 'test_data_bucket_name'],
  });

  useEffect(() => {
    // Initialize available generation and embedding models into the form data
    if (allModelsData?.models && !modelsInitialized.current) {
      modelsInitialized.current = true;
      form.reset({
        ...form.getValues(),
        // eslint-disable-next-line camelcase
        generation_models: allModelsData.models
          .filter((model) => model.type === 'llm')
          .map((model) => model.id)
          .toSorted((a, b) => a.localeCompare(b)),
        // eslint-disable-next-line camelcase
        embeddings_models: allModelsData.models
          .filter((model) => model.type === 'embedding')
          .map((model) => model.id)
          .toSorted((a, b) => a.localeCompare(b)),
      });
    }
  }, [allModelsData, form]);

  // Ensure test bucket and input bucket are always the same
  useEffect(() => {
    if (inputDataBucketName !== testDataBucketName) {
      form.setValue('test_data_bucket_name', inputDataBucketName);
      form.setValue('test_data_key', '');
    }
  }, [form, inputDataBucketName, testDataBucketName]);

  // reset selected file values if bucket changes
  useEffect(() => {
    form.setValue('input_data_key', '');
  }, [form]);

  const openExperimentSettings = () => {
    // Snapshot current form values as the "default" so reset() can revert to them
    form.reset({ ...form.getValues() });
    setIsExperimentSettingsOpen(true);
  };

  const saveExperimentSettingsChanges = () => {
    // TODO: add form update logic once ready
    setIsExperimentSettingsOpen(false);
  };

  if (!namespace) {
    return <Navigate to={autoragExperimentsPathname} replace />;
  }

  return (
    <>
      <Grid className="pf-v6-u-h-100" hasGutter>
        <GridItem span={4}>
          <Card isFullHeight>
            <CardHeader>
              <Title headingLevel="h3">Documents</Title>
              <Content className="pf-v6-u-mt-sm">
                Select or add an S3 connection to upload files or browse existing files.
              </Content>
            </CardHeader>
            <CardBody>
              <Stack>
                <StackItem>
                  <Split className="pf-v6-u-align-items-flex-end" hasGutter isWrappable>
                    <SplitItem style={{ width: '10rem' }} isFilled>
                      {Boolean(namespace) && (
                        <Controller
                          control={form.control}
                          name="input_data_secret_name"
                          render={({ field: { onChange } }) => (
                            <SecretSelector
                              namespace={String(namespace)}
                              type="storage"
                              additionalRequiredKeys={AUTORAG_REQUIRED_KEYS}
                              value={selectedSecret?.uuid}
                              onChange={(secret) => {
                                setSelectedSecret(secret);
                                onChange(!secret || secret.invalid ? '' : secret.name);
                                const bucketKey = findKey(
                                  secret?.data ?? {},
                                  (key) => key.toLowerCase() === 'aws_s3_bucket',
                                );
                                form.setValue(
                                  'input_data_bucket_name',
                                  secret && bucketKey ? secret.data[bucketKey] : '',
                                );
                              }}
                              onRefreshReady={(refresh) => {
                                secretsRefreshRef.current = refresh;
                              }}
                              label="S3 connection"
                              placeholder="Select connection"
                              toggleWidth="16rem"
                              dataTestId="aws-secret-selector"
                            />
                          )}
                        />
                      )}
                    </SplitItem>
                    <SplitItem>
                      <Button
                        key="add-new-connection"
                        onClick={() => setIsConnectionModalOpen(true)}
                      >
                        Add new connection
                      </Button>
                    </SplitItem>
                  </Split>
                </StackItem>
                {Boolean(selectedSecret?.uuid) && (
                  <>
                    <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                      Selected connection
                    </StackItem>
                    <StackItem>
                      <Label
                        onClose={() => {
                          setSelectedSecret(undefined);
                          form.setValue('input_data_secret_name', '');
                          form.setValue('input_data_bucket_name', '');
                        }}
                        closeBtnAriaLabel="Clear selected connection"
                      >
                        {selectedSecret?.displayName ?? selectedSecret?.name}
                      </Label>
                    </StackItem>

                    <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                      Selected files
                    </StackItem>
                    <StackItem>
                      <Button
                        key="select-files"
                        variant="secondary"
                        onClick={() => setIsFileExplorerOpen(true)}
                        isDisabled={
                          !selectedSecret || selectedSecret.invalid || form.formState.isSubmitting
                        }
                      >
                        Select files
                      </Button>
                    </StackItem>
                  </>
                )}
              </Stack>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={8}>
          <Card isFullHeight>
            <CardHeader>
              <Title headingLevel="h3">Configure Details</Title>
            </CardHeader>
            <CardBody>
              <Stack hasGutter>
                <StackItem className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm">
                  Where would you like to index your documents?
                </StackItem>
                <StackItem data-temp-placeholder>Vector index dropdown</StackItem>

                <StackItem className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm">
                  Add the data source you would like to use for evaluation.{' '}
                  <span className="pf-v6-u-text-color-required">*</span>
                </StackItem>
                <StackItem data-temp-placeholder>Evaluation data source upload component</StackItem>

                <StackItem>
                  <Card>
                    <CardHeader
                      hasWrap
                      actions={{
                        actions: [
                          <Watch
                            key="edit-experiment-settings"
                            control={form.control}
                            name="input_data_key"
                            render={(inputDataKey) => (
                              <Button
                                variant="secondary"
                                onClick={openExperimentSettings}
                                isDisabled={
                                  !inputDataBucketName ||
                                  !inputDataKey ||
                                  form.formState.isSubmitting
                                }
                              >
                                Edit
                              </Button>
                            )}
                          />,
                        ],
                      }}
                    >
                      <CardTitle>Models to consider</CardTitle>
                    </CardHeader>
                    <CardBody>
                      <Stack hasGutter>
                        <StackItem>
                          <Watch
                            control={form.control}
                            name="generation_models"
                            render={(generationModels) => (
                              <Flex
                                alignItems={{ default: 'alignItemsCenter' }}
                                spacer={{ default: 'spacerNone' }}
                                gap={{ default: 'gapSm' }}
                              >
                                <Content>{`${generationModels.length || 'No'} generation models`}</Content>
                                {!!generationModels.length && (
                                  <Popover
                                    bodyContent={
                                      <List>
                                        {generationModels.map((model) => (
                                          <ListItem key={`generation-${model}`}>{model}</ListItem>
                                        ))}
                                      </List>
                                    }
                                  >
                                    <DashboardPopupIconButton
                                      icon={<InfoCircleIcon />}
                                      hasNoPadding
                                    />
                                  </Popover>
                                )}
                              </Flex>
                            )}
                          />
                        </StackItem>
                        <StackItem>
                          <Watch
                            control={form.control}
                            name="embeddings_models"
                            render={(embeddingModels) => (
                              <Flex
                                alignItems={{ default: 'alignItemsCenter' }}
                                spacer={{ default: 'spacerNone' }}
                                gap={{ default: 'gapSm' }}
                              >
                                <Content>{`${embeddingModels.length || 'No'} embedding models`}</Content>
                                {!!embeddingModels.length && (
                                  <Popover
                                    bodyContent={
                                      <List>
                                        {embeddingModels.map((model) => (
                                          <ListItem key={`embedding-${model}`}>{model}</ListItem>
                                        ))}
                                      </List>
                                    }
                                  >
                                    <DashboardPopupIconButton
                                      icon={<InfoCircleIcon />}
                                      hasNoPadding
                                    />
                                  </Popover>
                                )}
                              </Flex>
                            )}
                          />
                        </StackItem>
                      </Stack>
                    </CardBody>
                    <CardTitle>Optimization metric</CardTitle>
                    <CardBody className="pf-v6-u-mb-sm">
                      <Watch
                        control={form.control}
                        name="optimization_metric"
                        render={(optimizationMetric) => optimizationMetric}
                      />
                    </CardBody>
                  </Card>
                </StackItem>
              </Stack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {isConnectionModalOpen && (
        <AutoragConnectionModal
          connectionTypes={autoragConnectionTypes}
          project={namespace}
          onClose={() => {
            setIsConnectionModalOpen(false);
          }}
          onSubmit={async (connection: Connection) => {
            const refresh = secretsRefreshRef.current;
            if (!refresh) {
              return;
            }
            const list = await refresh();
            const secret = list?.find((s) => s.name === connection.metadata.name);
            if (secret) {
              const requiredKeys = AUTORAG_REQUIRED_KEYS[secret.type ?? ''] ?? [];
              const availableKeys = Object.keys(connection.stringData ?? {});
              const invalid = getMissingRequiredKeys(requiredKeys, availableKeys).length > 0;
              setSelectedSecret({
                ...secret,
                invalid,
              });
              form.setValue('input_data_secret_name', invalid ? '' : secret.name);
            }
          }}
        />
      )}
      <FileExplorer
        id="AutoRagConfigure-FileExplorer"
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onPrimary={(files) => {
          // TODO: replace with actual logic once implemented
          form.setValue('input_data_bucket_name', 'bucket');
          form.setValue('input_data_key', 'key');
        }}
        onSelectSource={
          (source) => null /* eslint-disable-line @typescript-eslint/no-unused-vars */
        }
        files={[]}
        source={{
          name: 'Foo connection',
          count: 999999999,
        }}
      />
      <AutoragExperimentSettings
        isOpen={isExperimentSettingsOpen}
        onClose={() => {
          form.reset();
          setIsExperimentSettingsOpen(false);
        }}
        revertChanges={() => {
          form.reset();
          setIsExperimentSettingsOpen(false);
        }}
        saveChanges={saveExperimentSettingsChanges}
      />
    </>
  );
}

export default AutoragConfigure;
