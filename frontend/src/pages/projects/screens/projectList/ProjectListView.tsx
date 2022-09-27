import * as React from 'react';
import { Divider, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { ProjectKind } from '../../../../k8sTypes';
import ProjectTable from './ProjectTable';
import FilterToolbar from './FilterToolbar';
import NewProjectButton from './NewProjectButton';
import useTableColumnSort from '../../../../utilities/useTableColumnSort';
import { columns } from './tableData';

type ProjectListViewProps = {
  projects: ProjectKind[];
};

const ProjectListView: React.FC<ProjectListViewProps> = ({ projects: unfilteredProjects }) => {
  const { transformData, getColumnSort } = useTableColumnSort<ProjectKind>(columns, 0);
  const projects = transformData(unfilteredProjects);

  return (
    <>
      <FilterToolbar />
      <Divider />
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <NewProjectButton />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <ProjectTable projects={projects} getColumnSort={getColumnSort} />
    </>
  );
};

export default ProjectListView;
