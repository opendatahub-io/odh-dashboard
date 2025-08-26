import { RegistryExperimentRun, MLflowTagKeys } from '#~/concepts/modelRegistry/types';

export type NestedExperimentRun = RegistryExperimentRun & {
  children?: NestedExperimentRun[];
  isChild?: boolean;
  parentRunId?: string;
  level?: number;
};

export type ExperimentRunHierarchy = {
  topLevelRuns: NestedExperimentRun[];
  allRuns: Map<string, NestedExperimentRun>;
};

/**
 * Gets the parent run ID from the experiment run's custom properties
 */
export const getParentRunId = (run: RegistryExperimentRun): string | undefined =>
  run.customProperties[MLflowTagKeys.PARENT_RUN_ID]?.string_value;

/**
 * Organizes experiment runs into a hierarchical structure based on parent-child relationships
 */
export const organizeRunsHierarchy = (runs: RegistryExperimentRun[]): ExperimentRunHierarchy => {
  const allRuns = new Map<string, NestedExperimentRun>();
  const topLevelRuns: NestedExperimentRun[] = [];

  // First pass: create enhanced runs and build the map
  runs.forEach((run) => {
    const parentRunId = getParentRunId(run);
    const enhancedRun: NestedExperimentRun = {
      ...run,
      children: [],
      isChild: Boolean(parentRunId),
      parentRunId,
      level: 0,
    };
    allRuns.set(run.id, enhancedRun);
  });

  // Second pass: identify top-level runs (no parent or parent doesn't exist)
  const topLevelRunIds = new Set<string>();
  allRuns.forEach((run) => {
    if (!run.parentRunId || !allRuns.has(run.parentRunId)) {
      topLevelRunIds.add(run.id);
      topLevelRuns.push(run);
    }
  });

  // Third pass: recursively build hierarchy starting from top-level runs
  const buildHierarchy = (runId: string, currentLevel = 0): NestedExperimentRun => {
    const run = allRuns.get(runId);
    if (!run) {
      throw new Error(`Run with ID ${runId} not found`);
    }

    // Update the run's level
    const updatedRun: NestedExperimentRun = {
      ...run,
      level: currentLevel,
      children: [],
    };

    // Find all direct children of this run
    const children: NestedExperimentRun[] = [];
    allRuns.forEach((potentialChild) => {
      if (potentialChild.parentRunId === runId) {
        const childWithHierarchy = buildHierarchy(potentialChild.id, currentLevel + 1);
        children.push(childWithHierarchy);
      }
    });

    // Sort children by start time (newest first)
    const sortedChildren = children.toSorted((a, b) => {
      const aTime = parseInt(a.startTimeSinceEpoch || '0', 10);
      const bTime = parseInt(b.startTimeSinceEpoch || '0', 10);
      return bTime - aTime; // Descending order (newest first)
    });

    updatedRun.children = sortedChildren;

    // Update the run in the map with the complete hierarchy
    allRuns.set(runId, updatedRun);

    return updatedRun;
  };

  // Build hierarchy for all top-level runs
  const hierarchicalTopLevelRuns =
    topLevelRunIds.size > 0 ? Array.from(topLevelRunIds).map((runId) => buildHierarchy(runId)) : [];

  // Sort top-level runs by start time (newest first)
  const sortedTopLevel = hierarchicalTopLevelRuns.toSorted((a, b) => {
    const aTime = parseInt(a.startTimeSinceEpoch || '0', 10);
    const bTime = parseInt(b.startTimeSinceEpoch || '0', 10);
    return bTime - aTime; // Descending order (newest first)
  });

  return {
    topLevelRuns: sortedTopLevel,
    allRuns,
  };
};

/**
 * Flattens a hierarchical run structure into a list for table display,
 * respecting expanded/collapsed states
 */
export const flattenRunsForDisplay = (
  runs: NestedExperimentRun[],
  expandedRunIds: Set<string>,
): NestedExperimentRun[] => {
  const flattened: NestedExperimentRun[] = [];

  const flatten = (runList: NestedExperimentRun[], level = 0) => {
    runList.forEach((run) => {
      const runWithLevel = { ...run, level };
      flattened.push(runWithLevel);

      if (run.children && run.children.length > 0 && expandedRunIds.has(run.id)) {
        flatten(run.children, level + 1);
      }
    });
  };

  flatten(runs);
  return flattened;
};

/**
 * Checks if a run has children
 */
export const hasChildren = (run: NestedExperimentRun): boolean =>
  Boolean(run.children && run.children.length > 0);
