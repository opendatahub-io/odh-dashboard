import * as React from 'react';
import {
  ActionGroup,
  Button,
  Form,
  FormGroup,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { Controller, useFormContext } from 'react-hook-form';
import BenchmarkThresholdField from '~/app/components/BenchmarkThresholdField';
import { formatCategory } from '~/app/components/benchmarkUtils';
import { SUITE_EVALUATES_OPTIONS, isSuiteEvaluatesOption } from '~/app/pages/const';
import type { CopySuiteFormValues } from '~/app/schemas/copySuite.schema';

type CopySuiteSettingsStepProps = {
  availableCategories: string[];
  onNext: () => void;
  onCancel: () => void;
};

const formatEvaluatesLabel = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

const CopySuiteSettingsStep: React.FC<CopySuiteSettingsStepProps> = ({
  availableCategories,
  onNext,
  onCancel,
}) => {
  const { control, watch } = useFormContext<CopySuiteFormValues>();
  const suiteName = watch('suiteName');
  const [isCategoryOpen, setIsCategoryOpen] = React.useState(false);
  const [isEvaluatesOpen, setIsEvaluatesOpen] = React.useState(false);

  const isSettingsValid = suiteName.trim() !== '';

  return (
    <div id="copy-suite-step-content-settings" data-testid="copy-suite-step-settings">
      <Form id="copy-suite-form" style={{ maxWidth: 840 }} data-testid="copy-suite-form">
        <FormGroup label="Suite name" isRequired fieldId="suite-name">
          <Controller
            name="suiteName"
            control={control}
            render={({ field }) => (
              <TextInput
                id="suite-name"
                data-testid="suite-name-input"
                value={field.value}
                onChange={(_event, value) => field.onChange(value)}
                onBlur={field.onBlur}
                isRequired
              />
            )}
          />
        </FormGroup>

        <FormGroup label="Description" fieldId="suite-description">
          <Controller
            name="suiteDescription"
            control={control}
            render={({ field }) => (
              <TextArea
                id="suite-description"
                data-testid="suite-description-input"
                value={field.value}
                onChange={(_event, value) => field.onChange(value)}
                onBlur={field.onBlur}
                resizeOrientation="vertical"
              />
            )}
          />
        </FormGroup>

        <FormGroup label="Category" fieldId="suite-category">
          <Controller
            name="suiteCategory"
            control={control}
            render={({ field }) => (
              <Select
                id="suite-category-menu"
                data-testid="suite-category-select"
                isOpen={isCategoryOpen}
                selected={field.value}
                onSelect={(_event, value) => {
                  if (typeof value === 'string') {
                    field.onChange(value);
                  }
                  setIsCategoryOpen(false);
                }}
                onOpenChange={setIsCategoryOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    id="suite-category"
                    ref={toggleRef}
                    onClick={() => setIsCategoryOpen((prev) => !prev)}
                    isExpanded={isCategoryOpen}
                    isFullWidth
                    data-testid="suite-category-toggle"
                  >
                    {field.value ? formatCategory(field.value) : 'Select category'}
                  </MenuToggle>
                )}
                shouldFocusToggleOnSelect
              >
                <SelectList>
                  {availableCategories.map((category) => (
                    <SelectOption
                      key={category}
                      value={category}
                      isSelected={field.value === category}
                    >
                      {formatCategory(category)}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            )}
          />
        </FormGroup>

        <FormGroup label="Evaluates" fieldId="suite-evaluates">
          <Controller
            name="suiteEvaluates"
            control={control}
            render={({ field }) => (
              <Select
                id="suite-evaluates-menu"
                data-testid="suite-evaluates-select"
                isOpen={isEvaluatesOpen}
                selected={field.value}
                onSelect={(_event, value) => {
                  if (typeof value === 'string' && isSuiteEvaluatesOption(value)) {
                    field.onChange(value);
                  }
                  setIsEvaluatesOpen(false);
                }}
                onOpenChange={setIsEvaluatesOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    id="suite-evaluates"
                    ref={toggleRef}
                    onClick={() => setIsEvaluatesOpen((prev) => !prev)}
                    isExpanded={isEvaluatesOpen}
                    isFullWidth
                    data-testid="suite-evaluates-toggle"
                  >
                    {formatEvaluatesLabel(field.value)}
                  </MenuToggle>
                )}
                shouldFocusToggleOnSelect
              >
                <SelectList>
                  {SUITE_EVALUATES_OPTIONS.map((option) => (
                    <SelectOption key={option} value={option} isSelected={field.value === option}>
                      {formatEvaluatesLabel(option)}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            )}
          />
        </FormGroup>

        <Controller
          name="suiteThreshold"
          control={control}
          render={({ field }) => (
            <BenchmarkThresholdField
              value={field.value}
              onChange={field.onChange}
              label="Suite threshold"
              description="Set the minimum passing score for this suite. Results below this threshold are marked as failing."
              fieldId="suite-threshold"
            />
          )}
        />

        <ActionGroup>
          <Button
            variant="primary"
            data-testid="copy-suite-next"
            onClick={onNext}
            isDisabled={!isSettingsValid}
          >
            Next
          </Button>
          <Button variant="link" data-testid="copy-suite-cancel" onClick={onCancel}>
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </div>
  );
};

export default CopySuiteSettingsStep;
