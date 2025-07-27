import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import * as React from 'react';
import { MultiSelection, type SelectionOptions } from '#~/components/MultiSelection';
import { lmEvalTasks } from './data';

type LmEvalTaskSectionProps = {
  tasks: string[];
  setTasks: (tasks: string[]) => void;
};

const LMEvalTaskSection: React.FC<LmEvalTaskSectionProps> = ({ tasks, setTasks }) => {
  const initialOptions = React.useMemo<SelectionOptions[]>(
    () =>
      lmEvalTasks.map((o) => ({ id: o.value, name: o.content, selected: tasks.includes(o.value) })),
    [tasks],
  );

  const taskHelperText = 'Select at least 1 evaluation task.';

  const handleSelectionChange = React.useCallback(
    (selections: SelectionOptions[]) => {
      const selectedTaskIds = selections
        .filter((selection) => selection.selected)
        .map((selection) => String(selection.id));
      setTasks(selectedTaskIds);
    },
    [setTasks],
  );

  return (
    <FormGroup label="Select tasks" isRequired data-testid="tasks-form-group">
      <MultiSelection
        isScrollable
        value={initialOptions}
        setValue={handleSelectionChange}
        ariaLabel="Select evaluation tasks"
        placeholder="Select the evaluation to perform"
        noSelectedOptionsMessage="No tasks selected"
        listTestId="tasks-dropdown-list"
        toggleTestId="tasks-dropdown-toggle"
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem>{taskHelperText}</HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default LMEvalTaskSection;
