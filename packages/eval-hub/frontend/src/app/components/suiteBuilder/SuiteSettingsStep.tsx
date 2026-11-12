import * as React from 'react';
import {
  Alert,
  Content,
  Form,
  FormHelperText,
  FormGroup,
  HelperText,
  HelperTextItem,
  Skeleton,
  TextArea,
  TextInput,
  Title,
  useWizardContext,
} from '@patternfly/react-core';
import { Controller, useFormContext } from 'react-hook-form';
import CategoryField from '~/app/components/suiteBuilder/CategoryField';
import {
  suiteSettingsFieldNames,
  type SuiteBuilderFormValues,
} from '~/app/schemas/suiteBuilder.schema';

type SuiteSettingsStepProps = {
  categoryOptions: string[];
  categoriesLoaded: boolean;
  categoryLoadError: Error | undefined;
  canContinueSettings: boolean;
};

const SuiteSettingsStep: React.FC<SuiteSettingsStepProps> = ({
  categoryOptions,
  categoriesLoaded,
  categoryLoadError,
  canContinueSettings,
}) => {
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
        Set the suite name, description, and category.
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
        <FormGroup label="Category" fieldId="goal-suite-category" isRequired>
          {!categoriesLoaded && !categoryLoadError ? (
            <Skeleton
              data-testid="suite-builder-category-skeleton"
              width="100%"
              height="40px"
              screenreaderText="Loading categories"
            />
          ) : null}
          {categoryLoadError ? (
            <Alert
              variant="danger"
              isInline
              title="Unable to load categories"
              data-testid="suite-builder-category-error-state"
            />
          ) : null}
          {categoriesLoaded && !categoryLoadError ? (
            <CategoryField options={categoryOptions} isDisabled={categoryOptions.length === 0} />
          ) : null}
          {categoriesLoaded && !categoryLoadError && categoryOptions.length === 0 ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem data-testid="suite-builder-category-empty">
                  No categories are available from this project’s configured benchmark providers.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
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
