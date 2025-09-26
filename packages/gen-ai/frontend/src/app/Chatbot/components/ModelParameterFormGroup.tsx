import * as React from 'react';
import {
  FormGroup,
  Grid,
  GridItem,
  Slider,
  TextInput,
  Popover,
  Button,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';

interface ModelParameterFormGroupProps {
  fieldId: string;
  label: string;
  helpText: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const ModelParameterFormGroup: React.FunctionComponent<ModelParameterFormGroupProps> = ({
  fieldId,
  label,
  helpText,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
}) => (
  <FormGroup
    fieldId={fieldId}
    label={
      <span>
        {label}
        <Popover bodyContent={<div>{helpText}</div>}>
          <Button
            variant="plain"
            aria-label={`More info for ${label.toLowerCase()} field`}
            onClick={(e) => e.preventDefault()}
          >
            <HelpIcon />
          </Button>
        </Popover>
      </span>
    }
  >
    <Grid hasGutter>
      <GridItem span={8}>
        <Slider
          id={fieldId}
          value={value}
          onChange={(_event, newValue) => {
            const normalized = Number.isNaN(newValue)
              ? min
              : Math.min(max, Math.max(min, newValue));
            onChange(normalized);
          }}
          min={min}
          max={max}
          step={step}
          showBoundaries={false}
        />
      </GridItem>
      <GridItem span={4}>
        <TextInput
          id={`${fieldId}-input`}
          type="number"
          value={value}
          onChange={(_event, newValue) => {
            const parsed = parseFloat(newValue);
            const normalized = Number.isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed));
            onChange(normalized);
          }}
          min={min}
          max={max}
          step={step}
        />
      </GridItem>
    </Grid>
  </FormGroup>
);

export default ModelParameterFormGroup;
