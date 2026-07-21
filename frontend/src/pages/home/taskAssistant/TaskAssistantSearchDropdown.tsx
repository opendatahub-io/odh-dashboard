import React from 'react';
import { SearchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import type { ResolvedTaskGroup, ResolvedTaskItem } from './types';
import { fireShortcutClicked, fireSearchAborted } from './taskAssistantTracking';

type TaskAssistantSearchDropdownProps = {
  groups: Pick<ResolvedTaskGroup, 'id' | 'title'>[];
  tasks: Pick<ResolvedTaskItem, 'id' | 'group' | 'title' | 'href'>[];
};

const TaskAssistantSearchDropdown: React.FC<TaskAssistantSearchDropdownProps> = ({
  groups,
  tasks,
}) => {
  const navigate = useNavigate();
  const filterTextRef = React.useRef('');
  const hadFilteredRef = React.useRef(false);
  const didSelectRef = React.useRef(false);

  const selectOptions: TypeaheadSelectOption[] = React.useMemo(() => {
    const groupTitleMap = Object.fromEntries(groups.map((g) => [g.id, g.title]));
    return tasks.map((task) => ({
      value: task.id,
      content: task.title,
      group: groupTitleMap[task.group],
    }));
  }, [groups, tasks]);

  const handleInputChange = React.useCallback((newValue: string) => {
    filterTextRef.current = newValue;
    if (newValue.length > 0) {
      hadFilteredRef.current = true;
    }
  }, []);

  const handleSelect = React.useCallback(
    (_event: unknown, selection: string | number) => {
      const task = tasks.find((t) => t.id === selection);
      if (task) {
        didSelectRef.current = true;

        fireShortcutClicked({
          taskName: task.title,
          category: task.group,
          destination: task.href,
          viewContext: hadFilteredRef.current ? 'search-filtered' : 'search',
        });

        filterTextRef.current = '';
        navigate(task.href);
      }
    },
    [navigate, tasks],
  );

  const handleToggle = React.useCallback((nextIsOpen: boolean) => {
    if (!nextIsOpen) {
      if (!didSelectRef.current) {
        fireSearchAborted({ filtered: hadFilteredRef.current });
      }
      didSelectRef.current = false;
      filterTextRef.current = '';
      hadFilteredRef.current = false;
    }
  }, []);

  return (
    <TypeaheadSelect
      selectOptions={selectOptions}
      onSelect={handleSelect}
      onInputChange={handleInputChange}
      onToggle={handleToggle}
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
