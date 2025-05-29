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
import { MultiTypeaheadSelect, MultiTypeaheadSelectOption } from '@patternfly/react-templates';
import * as React from 'react';
import { lmEvalTasks } from './data';

type LmEvalTaskSectionProps = {
  tasks: string[];
  setTasks: (tasks: string[]) => void;
};

const LmEvalTaskSection: React.FC<LmEvalTaskSectionProps> = ({ tasks, setTasks }) => {
  const initialOptions = React.useMemo<MultiTypeaheadSelectOption[]>(
    () => lmEvalTasks.map((o) => ({ ...o, selected: tasks.includes(o.value) })),
    [tasks],
  );
  const taskHelperText =
    'Choose the type of evaluation that you want to perform. Red Hat support the top x evaluations';

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
      <MultiTypeaheadSelect
        isScrollable
        initialOptions={initialOptions}
        placeholder="Select the evaluation to perform"
        noOptionsFoundMessage={(filter) => `No state was found for "${filter}"`}
        onSelectionChange={(_items, selections) =>
          setTasks(
            selections.map((selection) =>
              typeof selection === 'number' ? String(selection) : selection,
            ),
          )
        }
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem>{taskHelperText}</HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

export default LmEvalTaskSection;
