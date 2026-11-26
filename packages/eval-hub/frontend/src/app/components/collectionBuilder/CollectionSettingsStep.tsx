import * as React from 'react';
import {
  Content,
  Form,
  FormHelperText,
  FormGroup,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  Slider,
  TextArea,
  TextInput,
  Title,
  useWizardContext,
} from '@patternfly/react-core';
import { Controller, useFormContext } from 'react-hook-form';
import GenerationSettingsFields from '~/app/components/collectionBuilder/GenerationSettingsFields';
import { MAX_COLLECTION_BENCHMARKS } from '~/app/pages/const';
import {
  collectionSettingsFieldNames,
  type CollectionBuilderFormValues,
} from '~/app/schemas/collectionBuilder.schema';
import type { InferenceServiceItem, Provider } from '~/app/types';
import './CollectionSettingsStep.scss';

type CollectionSettingsStepProps = {
  canContinueSettings: boolean;
  inferenceServices: InferenceServiceItem[];
  inferenceServicesLoaded: boolean;
  inferenceServicesError: Error | undefined;
  selectedModelIsAvailable: boolean;
  providers: Provider[];
  providersLoaded: boolean;
  providersError: Error | undefined;
};

const CollectionSettingsStep: React.FC<CollectionSettingsStepProps> = ({
  canContinueSettings,
  inferenceServices,
  inferenceServicesLoaded,
  inferenceServicesError,
  selectedModelIsAvailable,
  providers,
  providersLoaded,
  providersError,
}) => {
  const { control, trigger } = useFormContext<CollectionBuilderFormValues>();
  const { goToNextStep } = useWizardContext();
  const handleSettingsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canContinueSettings) {
      goToNextStep();
    } else {
      void trigger([...collectionSettingsFieldNames]);
    }
  };

  return (
    <div className="evalhub-goal-collection-page__step" data-testid="suite-settings-step">
      <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-sm">
        Collection settings
      </Title>
      <Content component="p" className="pf-v6-u-mb-lg">
        Set the collection name, description, and number of benchmarks.
      </Content>
      <Form
        id="suite-settings-form"
        data-testid="suite-settings-form"
        noValidate
        onSubmit={handleSettingsSubmit}
      >
        <Grid hasGutter>
          <GridItem span={12} lg={9}>
            <section aria-label="Collection details">
              <div className="evalhub-collection-settings-step__details-fields">
                <FormGroup label="Collection name" fieldId="goal-suite-name" isRequired>
                  <Controller
                    name="suiteName"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <TextInput
                          id="goal-suite-name"
                          isRequired
                          value={field.value}
                          onChange={(_event, value) => field.onChange(value)}
                          onBlur={field.onBlur}
                          validated={fieldState.error ? 'error' : 'default'}
                          aria-invalid={fieldState.error ? true : undefined}
                          data-testid="goal-suite-name"
                        />
                        {fieldState.error?.message ? (
                          <FormHelperText>
                            <HelperText>
                              <HelperTextItem
                                variant="error"
                                data-testid="suite-builder-name-error"
                              >
                                {fieldState.error.message}
                              </HelperTextItem>
                            </HelperText>
                          </FormHelperText>
                        ) : null}
                      </>
                    )}
                  />
                </FormGroup>
                <FormGroup label="Description" fieldId="goal-suite-description">
                  <Controller
                    name="suiteDescription"
                    control={control}
                    render={({ field }) => (
                      <TextArea
                        id="goal-suite-description"
                        value={field.value}
                        onChange={(_event, value) => field.onChange(value)}
                        onBlur={field.onBlur}
                        resizeOrientation="vertical"
                        data-testid="goal-suite-description"
                      />
                    )}
                  />
                </FormGroup>
                <Controller
                  name="maxBenchmarks"
                  control={control}
                  render={({ field, fieldState }) => (
                    <FormGroup label="Max number of benchmarks" fieldId="goal-suite-max-benchmarks">
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem id="suite-builder-max-benchmarks-helper">
                            Set the maximum number of benchmarks AI should recommend, from 1 to{' '}
                            {MAX_COLLECTION_BENCHMARKS}.
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                      <Slider
                        id="goal-suite-max-benchmarks"
                        min={1}
                        max={MAX_COLLECTION_BENCHMARKS}
                        step={1}
                        value={field.value}
                        onChange={(_event, value, inputValue) =>
                          field.onChange(inputValue ?? value)
                        }
                        onBlur={field.onBlur}
                        showBoundaries
                        isInputVisible
                        inputPosition="end"
                        inputValue={field.value}
                        className="evalhub-collection-settings-step__max-benchmarks-slider"
                        inputAriaLabel="Max number of benchmarks"
                        thumbAriaLabel="Max number of benchmarks"
                        aria-describedby={
                          fieldState.error
                            ? 'suite-builder-max-benchmarks-helper suite-builder-max-benchmarks-error'
                            : 'suite-builder-max-benchmarks-helper'
                        }
                        aria-invalid={fieldState.error ? true : undefined}
                        data-testid="goal-suite-max-benchmarks"
                      />
                      {fieldState.error?.message ? (
                        <FormHelperText>
                          <HelperText>
                            <HelperTextItem
                              id="suite-builder-max-benchmarks-error"
                              variant="error"
                              data-testid="suite-builder-max-benchmarks-error"
                            >
                              {fieldState.error.message}
                            </HelperTextItem>
                          </HelperText>
                        </FormHelperText>
                      ) : null}
                    </FormGroup>
                  )}
                />
              </div>
            </section>
          </GridItem>
          <GridItem
            span={12}
            lg={9}
            className="evalhub-collection-settings-step__generation-grid-item"
          >
            <GenerationSettingsFields
              inferenceServices={inferenceServices}
              inferenceServicesLoaded={inferenceServicesLoaded}
              inferenceServicesError={inferenceServicesError}
              selectedModelIsAvailable={selectedModelIsAvailable}
              providers={providers}
              providersLoaded={providersLoaded}
              providersError={providersError}
            />
          </GridItem>
        </Grid>
      </Form>
    </div>
  );
};

export default CollectionSettingsStep;
