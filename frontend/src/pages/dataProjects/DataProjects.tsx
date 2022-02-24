import * as React from 'react';
import {
  Divider,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  PageSection,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import DataProjectsHeaderToolbar from './DataProjectsHeaderToolbar';
import { LIST_VIEW, VIEW_TYPE } from './const';
import { useLocalStorage } from '../../utilities/useLocalStorage';
import DataProjectsDrawerPanel from './DataProjectsDrawerPanel';

import './DataProjects.scss';
import DataProjectsTableToolbar from './DataProjectsTableToolbar';
import DataProjectsTable from './DataProjectsTable';
import { projects } from './mockData';

const description = `Create new projects, or view everything you've been working on here.`;

export const DataProjects: React.FC = () => {
  const loaded = true; // temp
  const isEmpty = false; // temp
  const [viewType, setViewType] = useLocalStorage(VIEW_TYPE);
  const [isTableDrawerExpanded, setTableDrawerExpanded] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState(null);

  const onProjectSelect = (project) => {
    setSelectedProject(project);
    setTableDrawerExpanded(true);
  };

  const onDrawerPanelClose = () => {
    setSelectedProject(null);
    setTableDrawerExpanded(false);
  };

  return (
    <ApplicationsPage title="Projects" description={description} loaded={loaded} empty={isEmpty}>
      {!isEmpty ? (
        <>
          <DataProjectsHeaderToolbar
            viewType={viewType || LIST_VIEW}
            updateViewType={setViewType}
          />
          <Divider />
          <PageSection variant="light" padding={{ default: 'noPadding' }} isFilled>
            <Drawer isExpanded={isTableDrawerExpanded}>
              <DrawerContent
                panelContent={
                  <DataProjectsDrawerPanel
                    selectedProject={selectedProject}
                    onClose={onDrawerPanelClose}
                  />
                }
              >
                <DrawerContentBody>
                  <DataProjectsTableToolbar />
                  <DataProjectsTable projects={projects} onSelect={onProjectSelect} />
                </DrawerContentBody>
              </DrawerContent>
            </Drawer>
          </PageSection>
        </>
      ) : null}
    </ApplicationsPage>
  );
};
DataProjects.displayName = 'DataProjects';

export default DataProjects;
