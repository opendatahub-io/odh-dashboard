import * as React from 'react';
import { FormGroup, Select, SelectOption, Tooltip } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { METRIC_TYPE_DISPLAY_NAME } from '~/pages/modelServing/screens/metrics/const';
import { MetricTypes } from '~/api';
import { isMetricType } from '~/pages/modelServing/screens/metrics/utils';

type MetricTypeFieldProps = {
  fieldId: string;
  value?: MetricTypes;
  setValue: (value: MetricTypes) => void;
};

const MetricTypeField: React.FC<MetricTypeFieldProps> = ({ fieldId, value, setValue }) => {
  const [isOpen, setOpen] = React.useState(false);
  return (
    // TODO: decide what to show in the helper tooltip
    <FormGroup
      label="Metric type"
      fieldId={fieldId}
      labelIcon={
        <Tooltip content="TBD">
          <HelpIcon />
        </Tooltip>
      }
    >
      <Select
        removeFindDomNode
        id={fieldId}
        isOpen={isOpen}
        placeholderText="Select"
        onToggle={(open) => setOpen(open)}
        onSelect={(_, option) => {
          if (isMetricType(option)) {
            setValue(option);
            setOpen(false);
          }
        }}
        selections={value}
        menuAppendTo="parent"
      >
        {Object.keys(MetricTypes).map((type) => (
          <SelectOption key={type} value={type}>
            {METRIC_TYPE_DISPLAY_NAME[type]}
          </SelectOption>
        ))}
      </Select>
    </FormGroup>
  );
};

export default MetricTypeField;
