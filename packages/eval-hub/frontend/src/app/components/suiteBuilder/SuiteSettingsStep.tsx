import * as React from 'react';
import {
  Content,
  Form,
  FormHelperText,
  FormGroup,
  HelperText,
  HelperTextItem,
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
        Set the suite name and description.
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
