import * as React from 'react';
import { useVariableDefinitionActions } from '@perses-dev/dashboards';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';

export type HeaderProjectSelectorProps = {
  selectedProject: string;
  onProjectChange: (project: string) => void;
  /** All available project names for creating regex union when "All projects" is selected */
  allProjectNames: string[];
};

/**
 * Build a regex pattern that matches any of the given project names.
 * Returns a pattern like "(proj1|proj2|proj3)" or empty string if no projects.
 */
const buildProjectsRegexUnion = (projectNames: string[]): string => {
  if (projectNames.length === 0) {
    return '';
  }
  // Escape any special regex characters in project names
  const escaped = projectNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return `(${escaped.join('|')})`;
};

/**
 * Project selector that updates the Perses namespace variable
 * Must be inside PersesWrapper to access VariableProvider context
 */
const HeaderProjectSelector: React.FC<HeaderProjectSelectorProps> = ({
  selectedProject,
  onProjectChange,
  allProjectNames,
}) => {
  const { setVariableValue } = useVariableDefinitionActions();

  // Set the initial namespace variable value on mount and when dependencies change
  React.useEffect(() => {
    // When "All projects" is selected (empty string), use regex union of all project names
    const namespaceValue = selectedProject || buildProjectsRegexUnion(allProjectNames);
    setVariableValue('namespace', namespaceValue);
  }, [selectedProject, allProjectNames, setVariableValue]);

  const handleProjectChange = React.useCallback(
    (project: string) => {
      onProjectChange(project);
      // The useEffect above will handle updating the namespace variable
    },
    [onProjectChange],
  );

  return (
    <ProjectSelector
      namespace={selectedProject}
      onSelection={handleProjectChange}
      selectAllProjects
      placeholder="All projects"
      showTitle
    />
  );
};

export default HeaderProjectSelector;
