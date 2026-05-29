import * as React from 'react';
import { FormGroup, Slider, type SliderOnChangeEvent } from '@patternfly/react-core';
import LabelHelpPopover from '~/app/components/LabelHelpPopover';

type BenchmarkThresholdFieldProps = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  helpText?: string;
  fieldId?: string;
};

const BenchmarkThresholdField: React.FC<BenchmarkThresholdFieldProps> = ({
  value,
  onChange,
  label = 'Benchmark threshold',
  helpText = 'Set the minimum passing score for this evaluation. Results below this threshold will be marked as failing.',
  fieldId = 'benchmark-threshold',
}) => {
  const [sliderValue, setSliderValue] = React.useState(value);
  const [inputValue, setInputValue] = React.useState(value);

  React.useEffect(() => {
    setSliderValue(value);
    setInputValue(value);
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

  return (
    <FormGroup
      label={label}
      fieldId={fieldId}
      labelHelp={
        <LabelHelpPopover ariaLabel={`More info for ${label.toLowerCase()}`} content={helpText} />
      }
    >
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
    </FormGroup>
  );
};

export default BenchmarkThresholdField;
