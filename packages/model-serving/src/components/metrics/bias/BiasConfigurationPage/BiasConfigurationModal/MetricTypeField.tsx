import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { asEnumMember, enumIterator } from '@odh-dashboard/foundation';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import {
  METRIC_TYPE_DESCRIPTION,
  METRIC_TYPE_DISPLAY_NAME,
} from '../../../const';
import { BiasMetricType } from '@odh-dashboard/internal/api';
import { isMetricType } from '../../../utils';

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
      options={enumIterator(BiasMetricType).map(
        ([, type]): SimpleSelectOption => ({
          key: type,
          label: METRIC_TYPE_DISPLAY_NAME[type],
          description: METRIC_TYPE_DESCRIPTION[type],
        }),
      )}
      value={value}
      toggleProps={{ id: fieldId }}
      popperProps={{ maxWidth: undefined }}
    />
  </FormGroup>
);

export default MetricTypeField;
