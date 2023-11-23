import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import {
  METRIC_TYPE_DESCRIPTION,
  METRIC_TYPE_DISPLAY_NAME,
} from '~/pages/modelServing/screens/metrics/const';
import { BiasMetricType } from '~/api';
import { isMetricType } from '~/pages/modelServing/screens/metrics/utils';

type MetricTypeFieldProps = {
  fieldId: string;
  value?: BiasMetricType;
  onChange: (value: BiasMetricType) => void;
};

const MetricTypeField: React.FC<MetricTypeFieldProps> = ({ fieldId, value, onChange }) => {
  const [isOpen, setOpen] = React.useState(false);
  return (
    <FormGroup label="Metric type" fieldId={fieldId}>
      <Select
        removeFindDomNode
        id={fieldId}
        isOpen={isOpen}
        placeholderText="Select"
        onToggle={(open) => setOpen(open)}
        onSelect={(_, option) => {
          if (isMetricType(option)) {
            onChange(option);
            setOpen(false);
          }
        }}
        selections={value}
        menuAppendTo="parent"
      >
        {Object.keys(BiasMetricType).map((type) => (
          <SelectOption
            key={type}
            value={type}
            description={METRIC_TYPE_DESCRIPTION[type as keyof typeof BiasMetricType]}
          >
            {METRIC_TYPE_DISPLAY_NAME[type as keyof typeof BiasMetricType]}
          </SelectOption>
        ))}
      </Select>
    </FormGroup>
  );
};

export default MetricTypeField;
