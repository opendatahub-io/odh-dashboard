import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  PageSection,
  Title,
  Button,
  Flex,
  FlexItem,
  Breadcrumb,
  BreadcrumbItem,
  Tabs,
  Tab,
  TabTitleIcon,
  TabTitleText,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  Sidebar,
  SidebarPanel,
  SidebarContent,
  JumpLinks,
  JumpLinksItem,
  getResizeObserver,
  DataList,
} from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';

import { CogIcon, CubeIcon, CubesIcon, UsersIcon } from '@patternfly/react-icons';
import { useParams } from 'react-router-dom';
import WorkspaceModal from './modals/WorkspaceModal';
import DataModal from './modals/DataModal';
import DataCard from './components/DataCard';
import './DataProjects.scss';
import { Project, NotebookList, ImageStreamList, Notebook } from '../../types';
import {
  deleteDataProjectNotebook,
  getDataProject,
  getDataProjectNotebooks,
} from '../../services/dataProjectsService';
import { getImageStreams } from '../../services/imageStreamService';
import WorkspaceListItem from './components/WorkspaceListItem';
import { addNotification } from '../../redux/actions/actions';

const description = `View and edit data project and environment details.`;

const Empty = ({ type }) => (
  <EmptyState>
    <EmptyStateIcon icon={CubesIcon} />
    <Title headingLevel="h4" size="lg">
      No {type} here
    </Title>
    <EmptyStateBody>
      This represents an the empty state pattern in Patternfly 4. Hopefully it&apos;s simple enough
      to use but flexible enough to meet a variety of needs.
    </EmptyStateBody>
  </EmptyState>
);

export const DataProjectDetails: React.FC = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const history = useHistory();
  const dispatch = useDispatch();
  const [offsetHeight, setOffsetHeight] = React.useState(10);

  const [activeTabKey, setActiveTabKey] = React.useState(0);
  const [isCreateWorkspaceModalOpen, setCreateWorkspaceModalOpen] = React.useState(false);
  const [isAddDataModalOpen, setAddDataModalOpen] = React.useState(false);
  const [activeWorkspace, setActiveWorkspace] = React.useState<Notebook | null>(null);
  const [activeData, setActiveData] = React.useState(null);
  const [expandedListItems, setExpandedListItems] = React.useState<Set<string>>(new Set<string>());

  const [project, setProject] = React.useState<Project | undefined>(undefined);
  const [projectLoading, setProjectLoading] = React.useState(false);
  const [projectError, setProjectError] = React.useState(undefined);

  const [notebookList, setNotebookList] = React.useState<NotebookList | undefined>();
  const [notebooksLoading, setNotebooksLoading] = React.useState(false);

  const [imageList, setImageList] = React.useState<ImageStreamList | undefined>(undefined);
  const [imagesLoading, setImagesLoading] = React.useState(false);

  const dispatchError = (e: Error, title: string) => {
    dispatch(
      addNotification({
        status: 'danger',
        title,
        message: e.message,
        timestamp: new Date(),
      }),
    );
  };

  const dispatchSuccess = (title: string) => {
    dispatch(
      addNotification({
        status: 'success',
        title,
        timestamp: new Date(),
      }),
    );
  };

  const projectDisplayName =
    project?.metadata?.annotations?.['openshift.io/display-name'] ||
    project?.metadata?.name ||
    projectName;

  const loadProject = () => {
    setProjectLoading(true);
    getDataProject(projectName)
      .then((prj: Project) => {
        setProject(prj);
        setProjectLoading(false);
      })
      .catch((e) => {
        setProjectError(e);
        dispatchError(e, 'Load Project Error');
      });
  };

  const loadNotebooks = () => {
    setNotebooksLoading(true);
    getDataProjectNotebooks(projectName)
      .then((nbks: NotebookList) => {
        setNotebookList(nbks);
        setNotebooksLoading(false);
      })
      .catch((e) => {
        dispatchError(e, 'Load Notebook Error');
      });
  };

  const loadImages = () => {
    setImagesLoading(true);
    getImageStreams()
      .then((il: ImageStreamList) => {
        setImageList(il);
        setImagesLoading(false);
      })
      .catch((e) => {
        dispatchError(e, 'Load Images Error');
      });
  };

  React.useEffect(() => {
    const header = document.getElementsByClassName('pf-c-page__header')[0] as HTMLElement;
    const offsetForPadding = 10;
    getResizeObserver(header, () => {
      setOffsetHeight(header.offsetHeight + offsetForPadding);
    });
    loadImages();
    loadProject();
    loadNotebooks();
  }, []);

  const listEmpty = (list: NotebookList | ImageStreamList | undefined) =>
    !list || !list.items || list.items.length === 0;

  const handleCreateWorkspaceModalClose = () => {
    setCreateWorkspaceModalOpen(false);
  };

  const handleAddDataModalClose = () => {
    setAddDataModalOpen(false);
  };

  const handleTabClick = (event, tabIndex) => {
    setActiveTabKey(tabIndex);
  };

  const handleListItemToggle = (id: string) => {
    const newExpandedListItems = new Set(expandedListItems);
    newExpandedListItems.has(id) ? newExpandedListItems.delete(id) : newExpandedListItems.add(id);
    setExpandedListItems(newExpandedListItems);
  };

  return (
    <>
      <Breadcrumb className="odh-data-projects__breadcrumb">
        <BreadcrumbItem component="button" onClick={() => history.push('/data-projects')}>
          Data Projects
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{projectDisplayName}</BreadcrumbItem>
      </Breadcrumb>
      <ApplicationsPage
        title={projectDisplayName + ' Details'}
        description={description}
        loaded={!projectLoading}
        loadError={projectError}
        empty={!project}
        emptyMessage={'404: Project Not Found'}
      >
        <PageSection variant="light" padding={{ default: 'noPadding' }} isFilled>
          <Tabs
            activeKey={activeTabKey}
            onSelect={handleTabClick}
            className="odh-data-projects__details-tabs"
          >
            <Tab
              eventKey={0}
              title={
                <>
                  <TabTitleIcon>
                    <CubeIcon />
                  </TabTitleIcon>
                  <TabTitleText>Components</TabTitleText>
                </>
              }
            >
              <Sidebar hasGutter>
                <SidebarPanel variant="sticky">
                  <PageSection>
                    <JumpLinks
                      isVertical
                      label="Jump to section"
                      scrollableSelector="#scrollable-element"
                      offset={offsetHeight}
                    >
                      <JumpLinksItem href="#data-science-workspaces">
                        Data science workspaces
                      </JumpLinksItem>
                      <JumpLinksItem href="#data">Data</JumpLinksItem>
                    </JumpLinks>
                  </PageSection>
                </SidebarPanel>
                <SidebarContent>
                  <Flex direction={{ default: 'column' }} className="odh-data-projects__details">
                    <Flex>
                      <FlexItem>
                        <Title headingLevel="h3" size="xl" id="data-science-workspaces">
                          Data science workspaces
                        </Title>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setActiveWorkspace(null);
                            setCreateWorkspaceModalOpen(true);
                          }}
                        >
                          Create data science workspace
                        </Button>
                      </FlexItem>
                    </Flex>
                    {!listEmpty(notebookList) && !listEmpty(imageList) ? (
                      <DataList isCompact aria-label="Data project workspace list">
                        {notebookList!.items.map((notebook) => (
                          <WorkspaceListItem
                            key={`workspace-${notebook.metadata.name}`}
                            dataKey={`workspace-${notebook.metadata.name}`}
                            notebook={notebook}
                            imageStreams={imageList!.items}
                            setModalOpen={setCreateWorkspaceModalOpen}
                            setActiveEnvironment={setActiveWorkspace}
                            onDelete={(workspace) =>
                              deleteDataProjectNotebook(projectName, workspace.metadata.name)
                                .then(() => {
                                  dispatchSuccess('Delete Workspace Successfully');
                                  loadNotebooks();
                                })
                                .catch((e) => {
                                  dispatchError(e, 'Delete Workspace Error');
                                })
                            }
                            handleListItemToggle={handleListItemToggle}
                            expandedItems={expandedListItems}
                          />
                        ))}
                      </DataList>
                    ) : (
                      <Empty type="data science workspace" />
                    )}
                    <Flex>
                      <FlexItem>
                        <Title headingLevel="h3" size="xl" id="data">
                          Data
                        </Title>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setActiveData(null);
                            setAddDataModalOpen(true);
                          }}
                        >
                          Add data
                        </Button>
                      </FlexItem>
                    </Flex>
                    <Empty type="data" />
                    {/*{project.spec.data && project.spec.data.length !== 0 ? (*/}
                    {/*  <Grid sm={12} md={12} lg={12} xl={6} xl2={6} hasGutter>*/}
                    {/*    {project.spec.data.map((d, index) => (*/}
                    {/*      <GridItem key={`data-card-${index}`}>*/}
                    {/*        <DataCard*/}
                    {/*          data={d}*/}
                    {/*          setModalOpen={setAddDataModalOpen}*/}
                    {/*          setActiveData={setActiveData}*/}
                    {/*        />*/}
                    {/*      </GridItem>*/}
                    {/*    ))}*/}
                    {/*  </Grid>*/}
                    {/*) : (*/}
                    {/*  <Empty type="data" />*/}
                    {/*)}*/}
                  </Flex>
                </SidebarContent>
              </Sidebar>
            </Tab>
            <Tab
              eventKey={1}
              title={
                <>
                  <TabTitleIcon>
                    <UsersIcon />
                  </TabTitleIcon>
                  <TabTitleText>Sharing</TabTitleText>
                </>
              }
            >
              Sharing
            </Tab>
            <Tab
              eventKey={2}
              title={
                <>
                  <TabTitleIcon>
                    <CogIcon />
                  </TabTitleIcon>
                  <TabTitleText>Settings</TabTitleText>
                </>
              }
            >
              Settings
            </Tab>
          </Tabs>
        </PageSection>
      </ApplicationsPage>
      <WorkspaceModal
        project={project}
        imageStreams={listEmpty(imageList) ? [] : imageList!.items}
        notebook={activeWorkspace}
        isModalOpen={isCreateWorkspaceModalOpen}
        onClose={handleCreateWorkspaceModalClose}
        dispatchError={dispatchError}
        dispatchSuccess={dispatchSuccess}
        loadNotebooks={loadNotebooks}
      />
      <DataModal
        data={activeData}
        isModalOpen={isAddDataModalOpen}
        onClose={handleAddDataModalClose}
      />
    </>
  );
};
DataProjectDetails.displayName = 'DataProjectDetails';

export default DataProjectDetails;
