import * as React from 'react';
import {
  FormGroup,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  Slider,
  TextInput,
  type SliderOnChangeEvent,
} from '@patternfly/react-core';
import FormGroupLabel from '~/app/components/FormGroupLabel';
import { getMetricUnit, isPercentageMetric } from '~/app/utilities/evaluationUtils';
import './BenchmarkThresholdField.scss';

type BenchmarkThresholdFieldProps = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  description?: string;
  helpText?: string;
  fieldId?: string;
  metric?: string;
};

const BenchmarkThresholdField: React.FC<BenchmarkThresholdFieldProps> = ({
  value,
  onChange,
  label = 'Benchmark threshold',
  helpText,
  description = 'Set the minimum passing score for this evaluation. Results below this threshold will be marked as failing.',
  fieldId = 'benchmark-threshold',
  metric,
}) => {
  const isPercentage = isPercentageMetric(metric);
  const metricUnit = getMetricUnit(metric);
  const [sliderValue, setSliderValue] = React.useState(value);
  const [inputValue, setInputValue] = React.useState(value);
  const [rawInputValue, setRawInputValue] = React.useState(String(value));

  React.useEffect(() => {
    setSliderValue(value);
    setInputValue(value);
    setRawInputValue(String(value));
  }, [value]);

  const handleChange = React.useCallback(
    (
      _event: SliderOnChangeEvent,
      newSliderValue: number,
      newInputValue?: number,
      setThumbValue?: React.Dispatch<React.SetStateAction<number>>,
    ) => {
      let resolved: number;

      if (newInputValue === undefined) {
        resolved = Math.round(newSliderValue);
      } else if (newInputValue > 100) {
        resolved = 100;
        setThumbValue?.(100);
      } else if (newInputValue < 0) {
        resolved = 0;
        setThumbValue?.(0);
      } else {
        resolved = Math.round(newInputValue);
      }

      setSliderValue(resolved);
      setInputValue(resolved);
      onChange(resolved);
    },
    [onChange],
  );

  const handleRawInputBlur = React.useCallback(() => {
    const parsedValue = Number(rawInputValue);
    if (rawInputValue.trim() === '' || !Number.isFinite(parsedValue) || parsedValue < 0) {
      setRawInputValue(String(value));
      return;
    }

    const resolved = Math.round(parsedValue);
    setRawInputValue(String(resolved));
    if (resolved !== value) {
      onChange(resolved);
    }
  }, [onChange, rawInputValue, value]);

  const rawMetricInput = (
    <InputGroup className="pf-v6-u-w-50">
      <InputGroupItem isFill>
        <TextInput
          id={fieldId}
          data-testid={fieldId}
          type="number"
          min={0}
          step={1}
          value={rawInputValue}
          aria-label={label}
          onChange={(_event, newValue) => setRawInputValue(newValue)}
          onBlur={handleRawInputBlur}
        />
      </InputGroupItem>
      <InputGroupText isPlain>{metricUnit}</InputGroupText>
    </InputGroup>
  );

  return (
    <FormGroup
      className="evalhub-form-group--with-description"
      label={
        <FormGroupLabel
          label={label}
          description={description}
          helpPopover={
            helpText
              ? { ariaLabel: `More info for ${label.toLowerCase()}`, content: helpText }
              : undefined
          }
        />
      }
      fieldId={fieldId}
    >
      {/* Percentage metrics use a normalized 0-100 slider; raw metrics have provider-defined scales with no universal maximum. */}
      {isPercentage ? (
        <Slider
          data-testid={fieldId}
          min={0}
          max={100}
          value={sliderValue}
          inputValue={inputValue}
          onChange={handleChange}
          isInputVisible
          showBoundaries
          inputAriaLabel={label}
        />
      ) : (
        rawMetricInput
      )}
    </FormGroup>
  );
};

export default BenchmarkThresholdField;
