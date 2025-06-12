import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { NumericField } from '#~/concepts/connectionTypes/types';
import { AdvancedFieldProps } from '#~/pages/connectionTypes/manage/advanced/types';
import NumberInputWrapper from '#~/components/NumberInputWrapper';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import ExpandableFormSection from '#~/components/ExpandableFormSection';

const StandardUnits = ['MiB', 'GiB', 'Hours', 'Minutes', 'Seconds'];

enum Settings {
  Min,
  Max,
}

const NumericAdvancedPropertiesForm: React.FC<AdvancedFieldProps<NumericField>> = ({
  properties,
  onChange,
  onValidate,
}) => {
  const [lastTouched, setLastTouched] = React.useState<Settings>(Settings.Max);

  const isValid = React.useMemo(
    () =>
      (properties.min ?? Number.NEGATIVE_INFINITY) < (properties.max ?? Number.POSITIVE_INFINITY),
    [properties.max, properties.min],
  );
  React.useEffect(
    () => onValidate(isValid),
    // do not run when callback changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isValid],
  );

  const standardUnitOptions = React.useMemo(() => {
    const options: TypeaheadSelectOption[] = StandardUnits.map((unit) => ({
      value: unit,
      content: unit,
    }));
    if (properties.unit && !StandardUnits.includes(properties.unit)) {
      options.push({ value: properties.unit, content: properties.unit });
    }
    return options;
  }, [properties.unit]);

  return (
    <ExpandableFormSection
      toggleText="Advanced settings"
      initExpanded={
        !!properties.unit || properties.min !== undefined || properties.max !== undefined
      }
      data-testid="advanced-settings-toggle"
    >
      <FormGroup label="Unit" fieldId="unit-select">
        <TypeaheadSelect
          selectOptions={standardUnitOptions}
          selected={properties.unit}
          allowClear
          onSelect={(_ev, selection) => {
            onChange({
              ...properties,
              unit: String(selection),
            });
          }}
          onClearSelection={() => onChange({ ...properties, unit: undefined })}
          placeholder="Select a unit"
          isCreatable
        />
      </FormGroup>
      <FormGroup label="Lower threshold" fieldId="lower-threshold">
        <NumberInputWrapper
          inputProps={{
            id: 'lower-threshold',
            'data-testid': 'lower-threshold',
          }}
          value={properties.min ?? ''}
          onChange={(value) => {
            setLastTouched(Settings.Min);
            onChange({ ...properties, min: Number.isNaN(value) ? undefined : value });
          }}
          inputName="lower-threshold"
          validated={
            !isValid && lastTouched === Settings.Min
              ? ValidatedOptions.error
              : ValidatedOptions.default
          }
          intOnly={false}
          fullWidth
        />
        {!isValid && lastTouched === Settings.Min ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem
                icon={<ExclamationCircleIcon />}
                variant="error"
                data-testid="numeric-advanced-error-min"
              >
                The lower threshold must be less than the upper threshold
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </FormGroup>
      <FormGroup label="Upper threshold" fieldId="upper-threshold">
        <NumberInputWrapper
          inputProps={{
            id: 'upper-threshold',
            'data-testid': 'upper-threshold',
          }}
          inputName="upper-threshold"
          value={properties.max ?? ''}
          onChange={(value) => {
            setLastTouched(Settings.Max);
            onChange({ ...properties, max: Number.isNaN(value) ? undefined : value });
          }}
          validated={
            !isValid && lastTouched === Settings.Max
              ? ValidatedOptions.error
              : ValidatedOptions.default
          }
          intOnly={false}
          fullWidth
        />
        {!isValid && lastTouched === Settings.Max ? (
          <FormHelperText>
            <HelperText>
              <HelperTextItem
                icon={<ExclamationCircleIcon />}
                variant="error"
                data-testid="numeric-advanced-error-max"
              >
                The upper threshold must be greater than the lower threshold
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        ) : null}
      </FormGroup>
    </ExpandableFormSection>
  );
};

export default NumericAdvancedPropertiesForm;
