import * as React from 'react';
import { LMEvalKind, ProjectKind } from '#~/k8sTypes';
import { ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import LMEvalTable from './LMEvalTable';
import { initialLMEvalFilterData, LMEvalFilterDataType } from './const';
import LMEvalToolbar from './LMEvalToolbar';

type LMEvalListViewProps = {
  lmEval: LMEvalKind[];
};

export const getLMEvalProjectDisplayName = (
  lmEval: LMEvalKind,
  projects: ProjectKind[],
): string => {
  const project = projects.find(({ metadata: { name } }) => name === lmEval.metadata.namespace);
  return project ? getDisplayNameFromK8sResource(project) : 'Unknown';
};

const LMEvalListView: React.FC<LMEvalListViewProps> = ({ lmEval: unfilteredLMEval }) => {
  const { projects } = React.useContext(ProjectsContext);
  const [filterData, setFilterData] = React.useState<LMEvalFilterDataType>(initialLMEvalFilterData);

  const onClearFilters = React.useCallback(
    () => setFilterData(initialLMEvalFilterData),
    [setFilterData],
  );

  const filteredLMEval = React.useMemo(
    () =>
      unfilteredLMEval.filter((project) => {
        const nameFilter = filterData.Name?.toLowerCase();
        const projectFilter = filterData.Project?.toLowerCase();

        if (
          nameFilter &&
          !getDisplayNameFromK8sResource(project).toLowerCase().includes(nameFilter)
        ) {
          return false;
        }

        return (
          !projectFilter ||
          getLMEvalProjectDisplayName(project, projects).toLowerCase().includes(projectFilter)
        );
      }),
    [projects, filterData, unfilteredLMEval],
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  return (
    <LMEvalTable
      lmEval={filteredLMEval}
      onClearFilters={onClearFilters}
      toolbarContent={<LMEvalToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />}
    />
  );
};

export default LMEvalListView;
