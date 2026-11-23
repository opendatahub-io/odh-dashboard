import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { isAiProject } from '@odh-dashboard/k8s-core';
import { ProjectsContext } from '@odh-dashboard/ui-core/context/ProjectsContext';
import WorkingProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/WorkingProjectSelector';
import { isAiClassificationUnknown } from '../context/aiClassification';

const RhaiiProjectSelector: React.FC = () => {
  const { projects } = React.useContext(ProjectsContext);
  const aiProjectNames = React.useMemo(
    () => new Set(projects.filter(isAiProject).map(({ metadata }) => metadata.name)),
    [projects],
  );
  // A project whose classification is unknown stays under "AI projects only"
  // (without the AI badge), so the default filter never hides it.
  const aiFilterNames = React.useMemo(
    () =>
      new Set(
        projects
          .filter((project) => isAiProject(project) || isAiClassificationUnknown(project))
          .map(({ metadata }) => metadata.name),
      ),
    [projects],
  );

  return (
    <WorkingProjectSelector
      manualProjectMode
      isAiProject={(name) => aiProjectNames.has(name)}
      isInAiFilter={(name) => aiFilterNames.has(name)}
      aiLabel={
        <Label variant="outline" data-testid="ai-project-label" isCompact>
          AI
        </Label>
      }
      emptyListContent="There are no projects in the namespace list."
    />
  );
};

export default RhaiiProjectSelector;
