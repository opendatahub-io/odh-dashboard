import * as React from 'react';
import { Select, SelectOption } from '@patternfly/react-core';
import { isInEnum } from '~/typeHelpers';
import { ProjectScope } from '~/pages/projects/types';

type ProjectScopeSelectProps = {
  selection: ProjectScope;
  setSelection: (selection: ProjectScope) => void;
};

const isProjectScope = isInEnum(ProjectScope);

const ProjectScopeSelect: React.FC<ProjectScopeSelectProps> = ({ selection, setSelection }) => {
  const [isOpen, setOpen] = React.useState(false);
  return (
    <Select
      selections={selection}
      width="200px"
      onToggle={(open) => setOpen(open)}
      onSelect={(_, selection) => {
        if (isProjectScope(selection)) {
          setSelection(selection);
        }
        setOpen(false);
      }}
      isOpen={isOpen}
    >
      {[
        <SelectOption
          key={ProjectScope.DS_PROJECTS}
          value={ProjectScope.DS_PROJECTS}
          description="Only projects created in the Data Science Dashboard are displayed."
        />,
        <SelectOption
          key={ProjectScope.ALL_PROJECTS}
          value={ProjectScope.ALL_PROJECTS}
          description="All available projects created in the Data Science Dashboard and OpenShift are displayed."
        />,
      ]}
    </Select>
  );
};

export default ProjectScopeSelect;
