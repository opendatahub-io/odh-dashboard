import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import {
  METRIC_TYPE_DESCRIPTION,
  METRIC_TYPE_DISPLAY_NAME,
} from '~/pages/modelServing/screens/metrics/const';
import { MetricTypes } from '~/api';
import { isMetricType } from '~/pages/modelServing/screens/metrics/utils';

type MetricTypeFieldProps = {
  fieldId: string;
  value?: MetricTypes;
  onChange: (value: MetricTypes) => void;
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
        {Object.keys(MetricTypes).map((type) => (
          <SelectOption key={type} value={type} description={METRIC_TYPE_DESCRIPTION[type]}>
            {METRIC_TYPE_DISPLAY_NAME[type]}
          </SelectOption>
        ))}
      </Select>
    </FormGroup>
  );
};

export default MetricTypeField;
