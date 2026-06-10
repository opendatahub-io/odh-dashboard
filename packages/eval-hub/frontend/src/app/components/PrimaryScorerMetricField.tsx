import * as React from 'react';
import { FormGroup, MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import LabelHelpPopover from '~/app/components/LabelHelpPopover';

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
        {selected ?? 'Select a metric'}
      </MenuToggle>
    ),
    [isOpen, selected, fieldId],
  );

  if (metrics.length === 0) {
    return null;
  }

  return (
    <FormGroup
      label="Primary scorer metric"
      fieldId={fieldId}
      labelHelp={
        <LabelHelpPopover
          ariaLabel="More info for primary scorer metric"
          content="Choose the primary metric used to calculate the evaluation score for this benchmark."
        />
      }
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
            <SelectOption key={metric} value={metric} isSelected={metric === selected}>
              {metric}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    </FormGroup>
  );
};

export default PrimaryScorerMetricField;
