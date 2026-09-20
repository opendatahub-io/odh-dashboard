import * as React from 'react';
import { FormGroup, MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import FormGroupLabel from '~/app/components/FormGroupLabel';
import { getMetricDisplayName } from './benchmarkUtils';

type PrimaryScorerMetricFieldProps = {
  metrics: string[];
  selected: string | undefined;
  onChange: (metric: string) => void;
  fieldId?: string;
};

const PrimaryScorerMetricField: React.FC<PrimaryScorerMetricFieldProps> = ({
  metrics,
  selected,
  onChange,
  fieldId = 'primary-scorer-metric',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      if (typeof value === 'string') {
        onChange(value);
      }
      setIsOpen(false);
    },
    [onChange],
  );

  const toggle = React.useCallback(
    (toggleRef: React.Ref<HTMLButtonElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsOpen((prev) => !prev)}
        isExpanded={isOpen}
        isFullWidth
        data-testid={`${fieldId}-toggle`}
      >
        {selected ? getMetricDisplayName(selected) : 'Select a metric'}
      </MenuToggle>
    ),
    [isOpen, selected, fieldId],
  );

  if (metrics.length === 0) {
    return null;
  }

  return (
    <FormGroup
      className="evalhub-form-group--with-description"
      label={
        <FormGroupLabel
          label="Primary scorer metric"
          description="Choose the primary metric used to calculate the result for this benchmark."
        />
      }
      fieldId={fieldId}
    >
      <Select
        id={fieldId}
        isOpen={isOpen}
        selected={selected}
        onSelect={handleSelect}
        onOpenChange={setIsOpen}
        toggle={toggle}
        shouldFocusToggleOnSelect
      >
        <SelectList>
          {metrics.map((metric) => (
            <SelectOption
              key={metric}
              value={metric}
              isSelected={metric === selected}
              data-testid={`${fieldId}-option-${metric}`}
            >
              {getMetricDisplayName(metric)}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    </FormGroup>
  );
};

export default PrimaryScorerMetricField;
