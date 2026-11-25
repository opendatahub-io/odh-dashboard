import * as React from 'react';
import { isAiProject } from '@odh-dashboard/k8s-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import WorkingProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/WorkingProjectSelector';
import AILabel from '@odh-dashboard/ui-core/components/AILabel';

const RhaiiProjectSelector: React.FC = () => {
  const { projects } = React.useContext(ProjectsContext);
  const aiProjectNames = React.useMemo(
    () => new Set(projects.filter(isAiProject).map(({ metadata }) => metadata.name)),
    [projects],
  );

  return (
    <WorkingProjectSelector
      manualProjectMode
      isAiProject={(name) => aiProjectNames.has(name)}
      aiLabel={<AILabel />}
      emptyListContent="There are no projects in the namespace list."
    />
  );
};

export default RhaiiProjectSelector;
