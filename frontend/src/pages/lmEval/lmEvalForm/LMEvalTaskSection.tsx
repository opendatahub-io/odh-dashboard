import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  Popover,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { MultiSelection, type SelectionOptions } from '~/components/MultiSelection';
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

  const taskHelperText =
    'Choose the type of evaluation that you want to perform. Red Hat support the top x evaluations';

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
    <FormGroup
      label="Tasks"
      isRequired
      labelHelp={
        <Popover bodyContent={<></>}>
          <Button
            icon={
              <Icon isInline>
                <OutlinedQuestionCircleIcon />
              </Icon>
            }
            variant="plain"
            isInline
          />
        </Popover>
      }
    >
      <MultiSelection
        isScrollable
        value={initialOptions}
        setValue={handleSelectionChange}
        ariaLabel="Select evaluation tasks"
        placeholder="Select the evaluation to perform"
        noSelectedOptionsMessage="No tasks selected"
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
