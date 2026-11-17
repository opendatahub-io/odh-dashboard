import * as React from 'react';
import {
  Content,
  Flex,
  FlexItem,
  Form,
  FormHelperText,
  FormGroup,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Slider,
  TextArea,
  TextInput,
  Title,
  useWizardContext,
} from '@patternfly/react-core';
import { Controller, useFormContext } from 'react-hook-form';
import {
  suiteSettingsFieldNames,
  type SuiteBuilderFormValues,
} from '~/app/schemas/suiteBuilder.schema';

type SuiteSettingsStepProps = {
  canContinueSettings: boolean;
};

const SuiteSettingsStep: React.FC<SuiteSettingsStepProps> = ({ canContinueSettings }) => {
  const { control, trigger } = useFormContext<SuiteBuilderFormValues>();
  const { goToNextStep } = useWizardContext();
  const handleSettingsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canContinueSettings) {
      goToNextStep();
      return;
    }
    void trigger([...suiteSettingsFieldNames]);
  };

  return (
    <div className="evalhub-goal-suite-page__step" data-testid="suite-settings-step">
      <Title headingLevel="h2" size="xl" className="pf-v6-u-mb-sm">
        Suite settings
      </Title>
      <Content component="p" className="pf-v6-u-mb-lg">
        Set the suite name, description, and optional recommendation settings.
      </Content>
      <Form
        id="suite-settings-form"
        data-testid="suite-settings-form"
        noValidate
        onSubmit={handleSettingsSubmit}
      >
        <FormGroup label="Suite name" fieldId="goal-suite-name" isRequired>
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
                      <HelperTextItem variant="error" data-testid="suite-builder-name-error">
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
            <FormGroup label="Number of benchmarks" fieldId="goal-suite-max-benchmarks">
              <Slider
                id="goal-suite-max-benchmarks"
                min={1}
                max={20}
                step={1}
                value={field.value}
                onChange={(_event, value) => field.onChange(value)}
                onBlur={field.onBlur}
                showBoundaries={false}
                thumbAriaLabel="Number of benchmarks"
                aria-describedby={
                  fieldState.error
                    ? 'suite-builder-max-benchmarks-helper suite-builder-max-benchmarks-error'
                    : 'suite-builder-max-benchmarks-helper'
                }
                aria-invalid={fieldState.error ? true : undefined}
                data-testid="goal-suite-max-benchmarks"
              />
              <FormHelperText>
                <Flex
                  direction={{ default: 'column', md: 'row' }}
                  justifyContent={{ default: 'justifyContentSpaceBetween' }}
                  flexWrap={{ default: 'wrap' }}
                >
                  <FlexItem>
                    <HelperText>
                      <HelperTextItem id="suite-builder-max-benchmarks-helper">
                        Choose the maximum number of benchmarks AI should recommend
                      </HelperTextItem>
                    </HelperText>
                  </FlexItem>
                  <FlexItem className="pf-v6-u-font-size-sm pf-v6-u-text-align-end">
                    <div data-testid="goal-suite-max-benchmarks-summary">
                      {field.value} of 20 benchmarks
                    </div>
                  </FlexItem>
                </Flex>
              </FormHelperText>
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
        <FormGroup label="Strictness" fieldId="goal-suite-strictness">
          <Controller
            name="strictness"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <FormSelect
                  id="goal-suite-strictness"
                  value={field.value}
                  onChange={(_event, value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  validated={fieldState.error ? 'error' : 'default'}
                  aria-invalid={fieldState.error ? true : undefined}
                  data-testid="goal-suite-strictness"
                >
                  <FormSelectOption value="lenient" label="Lenient" />
                  <FormSelectOption value="moderate" label="Moderate" />
                  <FormSelectOption value="strict" label="Strict" />
                </FormSelect>
                {fieldState.error?.message ? (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem variant="error" data-testid="suite-builder-strictness-error">
                        {fieldState.error.message}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                ) : null}
              </>
            )}
          />
        </FormGroup>
        <FormGroup label="Generation effort" fieldId="goal-suite-generation-effort">
          <Controller
            name="generationEffort"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <FormSelect
                  id="goal-suite-generation-effort"
                  value={field.value}
                  onChange={(_event, value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  validated={fieldState.error ? 'error' : 'default'}
                  aria-invalid={fieldState.error ? true : undefined}
                  data-testid="goal-suite-generation-effort"
                >
                  <FormSelectOption value="low" label="Low" />
                  <FormSelectOption value="standard" label="Standard" />
                  <FormSelectOption value="high" label="High" />
                </FormSelect>
                {fieldState.error?.message ? (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem
                        variant="error"
                        data-testid="suite-builder-generation-effort-error"
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
        <FormGroup label="Evaluates" fieldId="goal-suite-evaluates" isRequired>
          <Content component="p" className="pf-v6-u-mb-0" data-testid="goal-suite-evaluates">
            Model
          </Content>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                The recommended benchmarks are configured to evaluate models.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </Form>
    </div>
  );
};

export default SuiteSettingsStep;
