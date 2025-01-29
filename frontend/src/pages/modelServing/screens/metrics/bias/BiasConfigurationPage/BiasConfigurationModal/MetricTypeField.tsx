import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import {
  METRIC_TYPE_DESCRIPTION,
  METRIC_TYPE_DISPLAY_NAME,
} from '~/pages/modelServing/screens/metrics/const';
import { BiasMetricType } from '~/api';
import { isMetricType } from '~/pages/modelServing/screens/metrics/utils';
import { asEnumMember, enumIterator } from '~/utilities/utils';
import SimpleSelect from '~/components/SimpleSelect';

type MetricTypeFieldProps = {
  fieldId: string;
  value?: BiasMetricType;
  onChange: (value: BiasMetricType) => void;
};

const MetricTypeField: React.FC<MetricTypeFieldProps> = ({ fieldId, value, onChange }) => (
  <FormGroup label="Metric type" fieldId={fieldId}>
    <SimpleSelect
      onChange={(selection) => {
        const selectedValue = asEnumMember(selection, BiasMetricType);
        if (isMetricType(selectedValue)) {
          onChange(selectedValue);
        }
      }}
      options={enumIterator(BiasMetricType).map(([, type]) => ({
        key: type,
        label: METRIC_TYPE_DISPLAY_NAME[type],
        description: METRIC_TYPE_DESCRIPTION[type],
      }))}
      value={value}
      placeholder="Select"
      toggleLabel={value ? METRIC_TYPE_DISPLAY_NAME[value] : undefined}
      toggleProps={{ id: fieldId }}
      popperProps={{ maxWidth: undefined }}
    />
  </FormGroup>
);

export default MetricTypeField;
