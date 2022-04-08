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
import * as _ from 'lodash';
import ApplicationsPage from '../ApplicationsPage';

import { CogIcon, CubeIcon, CubesIcon, UsersIcon } from '@patternfly/react-icons';
import { useParams } from 'react-router-dom';
import WorkspaceModal from './modals/WorkspaceModal';
import DataModal from './modals/DataModal';
import WorkspaceListItem from './components/WorkspaceListItem';
import PvcListItem from './components/PvcListItem';
import './DataProjects.scss';

import { useInterval } from '../../utilities/useInterval';
import {
  Project,
  NotebookList,
  ImageStreamList,
  Notebook,
  OdhConfig,
  PersistentVolumeClaimList,
  PersistentVolumeClaim,
} from '../../types';
import {
  deleteDataProjectNotebook,
  getDataProject,
  getDataProjectNotebooks,
} from '../../services/dataProjectsService';
import { getImageStreams } from '../../services/imageStreamService';
import { deletePvc, getPvcs } from '../../services/storageService';
import { addNotification } from '../../redux/actions/actions';
import { getOdhConfig } from '../../services/odhConfigService';

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

  const [pvcList, setPvcList] = React.useState<PersistentVolumeClaimList | undefined>(undefined);
  const [pvcsLoading, setPvcsLoading] = React.useState(false);

  const [odhConfig, setOdhConfig] = React.useState<OdhConfig | undefined>(undefined);
  const [odhConfigLoading, setOdhConfigLoading] = React.useState(false);

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

  // const loadStorageClasses = () => {
  //   setPvcsLoading(true);
  //   getPvcs(projectName)
  //     .then((pl: PersistentVolumeClaimList) => {
  //       setPvcList(pl);
  //       setPvcsLoading(false);
  //     })
  //     .catch((e) => {
  //       dispatchError(e, 'Load Images Error');
  //     });
  // };
  //
  const loadPvcs = () => {
    setPvcsLoading(true);
    getPvcs(projectName)
      .then((pl: PersistentVolumeClaimList) => {
        setPvcList(pl);
        setPvcsLoading(false);
      })
      .catch((e) => {
        dispatchError(e, 'Load Images Error');
      });
  };

  // TODO: used for notebook sizes
  // but should be retrieved from Global Context
  const loadOdhConfig = () => {
    setOdhConfigLoading(true);
    getOdhConfig()
      .then((cfg: OdhConfig) => {
        setOdhConfig(cfg);
        setOdhConfigLoading(false);
      })
      .catch((e) => {
        dispatchError(e, 'Load Images Error');
      });
  };

  const updateNotebook = (notebook: Notebook): void => {
    if (!notebookList?.items) {
      return;
    }
    const newNbList = _.cloneDeep(notebookList);
    const idx = newNbList.items.findIndex((nbk) => nbk.metadata.name === notebook.metadata.name);
    if (idx >= 0) {
      newNbList.items.splice(idx, 1, notebook);
      setNotebookList(newNbList);
    }
  };

  React.useEffect(() => {
    const header = document.getElementsByClassName('pf-c-page__header')[0] as HTMLElement;
    const offsetForPadding = 10;
    getResizeObserver(header, () => {
      setOffsetHeight(header.offsetHeight + offsetForPadding);
    });
    loadOdhConfig();
    loadProject();
    loadImages();
    loadNotebooks();
    loadPvcs();
  }, []);

  useInterval(() => {
    loadNotebooks();
  }, 5000);

  const listEmpty = (
    list: NotebookList | ImageStreamList | PersistentVolumeClaimList | undefined,
  ) => !list || !list.items || list.items.length === 0;

  const handleCreateWorkspaceModalClose = () => {
    setCreateWorkspaceModalOpen(false);
    loadNotebooks();
    loadPvcs();
  };

  const handleAddDataModalClose = () => {
    setAddDataModalOpen(false);
    loadPvcs();
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
                            updateNotebook={updateNotebook}
                            imageStreams={imageList!.items}
                            pvcList={pvcList}
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
                    {/*{!listEmpty(pvcList) && !listEmpty(storageClasses) ? (*/}
                    {!listEmpty(pvcList) ? (
                      <DataList isCompact aria-label="Data project pvc list">
                        {pvcList!.items.map((pvc) => (
                          <PvcListItem
                            key={`workspace-${pvc.metadata.name}`}
                            dataKey={`workspace-${pvc.metadata.name}`}
                            pvc={pvc}
                            updatePvc={(pvc: PersistentVolumeClaim) => {}}
                            setModalOpen={setCreateWorkspaceModalOpen}
                            onDelete={(pvc) => {
                              deletePvc(projectName, pvc.metadata.name).then(loadPvcs);
                            }}
                            handleListItemToggle={handleListItemToggle}
                            expandedItems={expandedListItems}
                          />
                        ))}
                      </DataList>
                    ) : (
                      <Empty type="data" />
                    )}
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
        odhConfig={odhConfig}
        imageStreams={listEmpty(imageList) ? [] : imageList!.items}
        pvcList={pvcList}
        notebook={activeWorkspace}
        isModalOpen={isCreateWorkspaceModalOpen}
        onClose={handleCreateWorkspaceModalClose}
        dispatchError={dispatchError}
        dispatchSuccess={dispatchSuccess}
      />
      <DataModal
        project={project}
        notebookList={notebookList}
        data={activeData}
        isModalOpen={isAddDataModalOpen}
        onClose={handleAddDataModalClose}
        dispatchError={dispatchError}
      />
    </>
  );
};
DataProjectDetails.displayName = 'DataProjectDetails';

export default DataProjectDetails;
