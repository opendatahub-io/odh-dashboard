import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { isAiProject } from '@odh-dashboard/k8s-core';
import WorkingProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/WorkingProjectSelector';
import { isAiClassificationUnknown } from '../context/aiClassification';
import { KnownProjectsContext } from '../context/KnownProjectsContext';

const RhaiiProjectSelector: React.FC = () => {
  // Every known project, names listed during a discovery outage included: the
  // fallback list still carries their AI label.
  const knownProjects = React.useContext(KnownProjectsContext);
  const aiProjectNames = React.useMemo(
    () => new Set(knownProjects.filter(isAiProject).map(({ metadata }) => metadata.name)),
    [knownProjects],
  );
  // A project whose classification is unknown stays under "AI projects only"
  // (without the AI badge), so the default filter never hides it. That covers
  // namespaces discovery could not read and names with no data at all.
  const aiFilterNames = React.useMemo(
    () =>
      new Set(
        knownProjects
          .filter((project) => isAiProject(project) || isAiClassificationUnknown(project))
          .map(({ metadata }) => metadata.name),
      ),
    [knownProjects],
  );
  const knownNames = React.useMemo(
    () => new Set(knownProjects.map(({ metadata }) => metadata.name)),
    [knownProjects],
  );

  return (
    <WorkingProjectSelector
      manualProjectMode
      isAiProject={(name) => aiProjectNames.has(name)}
      isInAiFilter={(name) => aiFilterNames.has(name) || !knownNames.has(name)}
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
