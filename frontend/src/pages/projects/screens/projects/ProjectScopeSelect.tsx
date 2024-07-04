import * as React from 'react';

import { isInEnum } from '~/typeHelpers';
import { ProjectScope } from '~/pages/projects/types';
import SimpleSelect from '~/components/SimpleSelect';

type ProjectScopeSelectProps = {
  selection: ProjectScope;
  setSelection: (selection: ProjectScope) => void;
};

const isProjectScope = isInEnum(ProjectScope);

const ProjectScopeSelect: React.FC<ProjectScopeSelectProps> = ({ selection, setSelection }) => (
  <SimpleSelect
    popperProps={{ width: '200px' }}
    style={{ width: '200px' }}
    toggleLabel={selection}
    options={[
      {
        key: ProjectScope.DS_PROJECTS,
        children: ProjectScope.DS_PROJECTS,
        description: 'Only projects created in the Data Science Dashboard are displayed.',
      },
      {
        key: ProjectScope.ALL_PROJECTS,
        children: ProjectScope.ALL_PROJECTS,
        description:
          'All available projects created in the Data Science Dashboard and OpenShift are displayed.',
      },
    ]}
    onSelect={(_, newSelection) => {
      if (isProjectScope(newSelection)) {
        setSelection(newSelection);
      }
    }}
  />
);

export default ProjectScopeSelect;
