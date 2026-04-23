import React from 'react';
import { SearchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import type { ResolvedTaskGroup, ResolvedTaskItem } from './types';

type TaskAssistantSearchDropdownProps = {
  groups: Pick<ResolvedTaskGroup, 'id' | 'title'>[];
  tasks: Pick<ResolvedTaskItem, 'id' | 'group' | 'title' | 'href'>[];
};

const TaskAssistantSearchDropdown: React.FC<TaskAssistantSearchDropdownProps> = ({
  groups,
  tasks,
}) => {
  const navigate = useNavigate();

  const selectOptions: TypeaheadSelectOption[] = React.useMemo(() => {
    const groupTitleMap = Object.fromEntries(groups.map((g) => [g.id, g.title]));
    return tasks.map((task) => ({
      value: task.id,
      content: task.title,
      group: groupTitleMap[task.group],
    }));
  }, [groups, tasks]);

  const handleSelect = React.useCallback(
    (_event: unknown, selection: string | number) => {
      const task = tasks.find((t) => t.id === selection);
      if (task) {
        navigate(task.href);
      }
    },
    [navigate, tasks],
  );

  return (
    <TypeaheadSelect
      selectOptions={selectOptions}
      onSelect={handleSelect}
      placeholder="Looking for another task?"
      isRequired={false}
      allowClear
      previewDescription={false}
      dataTestId="task-assistant-search"
      popperProps={{ position: 'end' }}
      inputIcon={<SearchIcon />}
      toggleWidth="270px"
    />
  );
};

export default TaskAssistantSearchDropdown;
