import * as React from 'react';
import * as _ from 'lodash';
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
import DataSourceModal from './modals/DataSourceModal';
import WorkspaceListItem from './components/WorkspaceListItem';
import PvcListItem from './components/PvcListItem';
import ObjectStorageListItem from './components/ObjectStorageListItem';
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
  StorageClassList,
  SecretList,
  PredictorList,
  Predictor,
  OpenShiftRoute,
  ServingRuntimeList,
} from '../../types';
import { getDataProject } from '../../services/dataProjectsService';
import { deleteNotebook } from '../../services/notebookService';
import { getImageStreams } from '../../services/imageStreamService';
import { deletePvc, getPvcs, getStorageClasses } from '../../services/storageService';
import { addNotification } from '../../redux/actions/actions';
import { getOdhConfig } from '../../services/odhConfigService';
import ModelServingModal from './modals/ModelServingModal';
import StorageModal from './modals/StorageModal';
import AttachStorageModal from './modals/AttachStorageModal';
import { deleteSecret, getSecrets } from '../../services/secretService';
import { ODH_TYPE, ODH_TYPE_OBJECT_STORAGE } from '../../utilities/const';
import { useGetNotebooks } from '../../utilities/useGetNotebooks';
import PermissionTabContent from './tabs/permissionTab/PermissionTabContent';
import { getNotebookStatefulSet } from '../../utilities/notebookUtils';
import { deletePredictor, getPredictors, getServingRoute } from '../../services/predictorService';
import PredictorListItem from './components/PredictorListItem';

const description = `View and edit data project and environment details.`;

const Empty = ({ type }) => (
  <EmptyState>
    <EmptyStateIcon icon={CubesIcon} />
    <Title headingLevel="h4" size="lg">
      No {type} found
    </Title>
    <EmptyStateBody>
      This represents an the empty state pattern in Patternfly 4. Hopefully it&apos;s simple enough
      to use but flexible enough to meet a variety of needs.
    </EmptyStateBody>
  </EmptyState>
);

export const DataProjectDetails: React.FC = React.memo(() => {
  const { projectName } = useParams<{ projectName: string }>();
  const history = useHistory();
  const dispatch = useDispatch();

  const { notebookList, statefulSetList, loadNotebooks, watchNotebookStatus } =
    useGetNotebooks(projectName);

  const [offsetHeight, setOffsetHeight] = React.useState(10);

  const [activeTabKey, setActiveTabKey] = React.useState(0);
  const [isCreateWorkspaceModalOpen, setCreateWorkspaceModalOpen] = React.useState(false);
  const [isAttachStorageModalOpen, setAttachStorageModalOpen] = React.useState(false);
  const [isAddStorageModalOpen, setAddStorageModalOpen] = React.useState(false);
  const [isAddDataSourceModalOpen, setAddDataSourceModalOpen] = React.useState(false);
  const [isModelServingModalOpen, setModelServingModalOpen] = React.useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = React.useState<Notebook | null>(null);
  const [selectedStorage, setSelectedStorage] = React.useState(null);
  const [selectedDataSource, setSelectedDataSource] = React.useState(null);
  const [expandedListItems, setExpandedListItems] = React.useState<Set<string>>(new Set<string>());
  const [connections, setConnections] = React.useState<Map<string, string>>(new Map());

  const [project, setProject] = React.useState<Project>();
  const [projectLoading, setProjectLoading] = React.useState(false);
  const [projectError, setProjectError] = React.useState(undefined);

  const [imageList, setImageList] = React.useState<ImageStreamList | undefined>(undefined);
  const [imagesLoading, setImagesLoading] = React.useState(false);

  const [storageClassList, setStorageClassList] = React.useState<StorageClassList | undefined>(
    undefined,
  );
  const [storageClassListLoading, setStorageClassListLoading] = React.useState(false);

  const [pvcList, setPvcList] = React.useState<PersistentVolumeClaimList | undefined>(undefined);
  const [pvcsLoading, setPvcsLoading] = React.useState(false);

  const [secretList, setSecretList] = React.useState<SecretList | undefined>(undefined);
  const [objectStorageListLoading, setObjectStorageListLoading] = React.useState(false);

  const [odhConfig, setOdhConfig] = React.useState<OdhConfig | undefined>(undefined);
  const [odhConfigLoading, setOdhConfigLoading] = React.useState(false);

  const [predictorList, setPredictorList] = React.useState<PredictorList | undefined>(undefined);
  const [predictorListLoading, setPredictorListLoading] = React.useState(false);

  const [servingRuntimeList, setServingRuntimeList] = React.useState<
    ServingRuntimeList | undefined
  >(undefined);
  const [servingRoute, setServingRoute] = React.useState<OpenShiftRoute | undefined>(undefined);

  const objectStorageList: SecretList = {
    metadata: {},
    items:
      secretList?.items.filter((secret) => {
        return secret?.metadata?.labels?.[ODH_TYPE] === ODH_TYPE_OBJECT_STORAGE;
      }) || [],
  };

  const servingStorageConfig = {
    items: secretList?.items.find((secret) => {
      return secret?.metadata?.name === 'storage-config';
    }),
  };

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
    return getDataProject(projectName)
      .then((prj: Project) => {
        setProject(prj);
        setProjectLoading(false);
      })
      .catch((e) => {
        setProjectLoading(false);
        setProjectError(e);
        dispatchError(e, 'Load Project Error');
      });
  };

  const loadImages = () => {
    setImagesLoading(true);
    return getImageStreams()
      .then((il: ImageStreamList) => {
        setImageList(il);
        setImagesLoading(false);
      })
      .catch((e) => {
        dispatchError(e, 'Load Images Error');
      });
  };

  const loadStorageClasses = () => {
    setStorageClassListLoading(true);
    return getStorageClasses()
      .then((scl: StorageClassList) => {
        setStorageClassList(scl);
        setStorageClassListLoading(false);
      })
      .catch((e) => {
        dispatchError(e, 'Load StorageClasses Error');
      });
  };

  const loadPvcs = () => {
    setPvcsLoading(true);
    return getPvcs(projectName)
      .then((pl: PersistentVolumeClaimList) => {
        setPvcList(pl);
        setPvcsLoading(false);
      })
      .catch((e) => {
        dispatchError(e, 'Load PVC Error');
      });
  };

  const loadObjectStorage = () => {
    setObjectStorageListLoading(true);
    return getSecrets(projectName)
      .then((sl: SecretList) => {
        setSecretList(sl);
        setObjectStorageListLoading(false);
      })
      .catch((e) => {
        dispatchError(e, 'Load Object Storage Error');
      });
  };

  const loadServing = () => {
    getServingRoute(projectName)
      .then((sr: OpenShiftRoute) => {
        setServingRoute(sr);
      })
      .catch((e) => {
        dispatchError(e, 'Load Serving Route Error');
      });

    setPredictorListLoading(true);
    return getPredictors(projectName)
      .then((pl: PredictorList) => {
        setPredictorList(pl);
        setPredictorListLoading(false);
      })
      .catch((e) => {
        dispatchError(e, 'Load Served Models Error');
      });
  };

  // TODO: used for notebook sizes
  // but should be retrieved from Global Context
  const loadOdhConfig = () => {
    setOdhConfigLoading(true);
    return getOdhConfig()
      .then((cfg: OdhConfig) => {
        setOdhConfig(cfg);
        setOdhConfigLoading(false);
      })
      .catch((e) => {
        dispatchError(e, 'Load ODH Config Error');
      });
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
    loadStorageClasses();
    loadPvcs();
    loadObjectStorage();
    loadServing();
  }, []);

  React.useEffect(() => {
    const newConnections = new Map();
    notebookList?.items.forEach((notebook) => {
      const volumes = notebook.spec.template.spec.volumes;
      if (volumes && volumes.length) {
        volumes.forEach((volume) => {
          newConnections.set(volume.name, notebook.metadata.name);
        });
      }
    });
    if (!_.isEqual(connections, newConnections)) {
      setConnections(newConnections);
    }
  }, [notebookList]);

  useInterval(() => {
    loadPvcs();
    loadObjectStorage();
    loadServing();
  }, 10000);

  const listEmpty = (
    list:
      | NotebookList
      | ImageStreamList
      | PersistentVolumeClaimList
      | StorageClassList
      | SecretList
      | PredictorList
      | undefined,
  ) => !list || !list.items || list.items.length === 0;

  const handleCreateWorkspaceModalClose = () => {
    setCreateWorkspaceModalOpen(false);
    loadNotebooks();
    loadPvcs();
  };

  const handleAttachStorageModalOpen = (notebook: Notebook) => {
    setSelectedWorkspace(notebook);
    setAttachStorageModalOpen(true);
  };

  const handleAttachStorageModalClose = () => {
    setAttachStorageModalOpen(false);
    loadNotebooks();
    loadPvcs();
  };

  const handleAddStorageModalClose = () => {
    setAddStorageModalOpen(false);
    loadNotebooks();
    loadPvcs();
  };

  const handleAddDataSourceModalClose = () => {
    setAddDataSourceModalOpen(false);
    loadNotebooks();
    loadObjectStorage();
  };

  const handleModelServingModalClose = () => {
    setModelServingModalOpen(false);
    loadServing();
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
        <BreadcrumbItem component="button" onClick={() => history.push('/')}>
          Data Projects
        </BreadcrumbItem>
        <BreadcrumbItem isActive>{projectDisplayName}</BreadcrumbItem>
      </Breadcrumb>
      <ApplicationsPage
        title={projectDisplayName}
        description={description}
        loaded={!projectLoading}
        loadError={projectError}
        empty={!project}
        emptyMessage={'404: Project Not Found'}
      >
        {project ? (
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
                id={`${project.metadata.name}-tab-components`}
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
                        <JumpLinksItem href="#storage">Storage</JumpLinksItem>
                        <JumpLinksItem href="#data-sources">Data sources</JumpLinksItem>
                        <JumpLinksItem href="#model-serving">Model serving</JumpLinksItem>
                      </JumpLinks>
                    </PageSection>
                  </SidebarPanel>
                  <SidebarContent className="odh-data-projects__details">
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
                            setSelectedWorkspace(null);
                            setCreateWorkspaceModalOpen(true);
                          }}
                        >
                          Create data science workspace
                        </Button>
                      </FlexItem>
                    </Flex>
                    {!listEmpty(notebookList) && !listEmpty(imageList) ? (
                      <DataList
                        className="odh-data-projects__data-list"
                        isCompact
                        aria-label="Data project workspace list"
                      >
                        {notebookList?.items.map((notebook) => (
                          <WorkspaceListItem
                            key={`workspace-${notebook.metadata.name}`}
                            dataKey={`workspace-${notebook.metadata.name}`}
                            notebook={notebook}
                            statefulSet={getNotebookStatefulSet(notebook, statefulSetList)}
                            loadNotebooks={loadNotebooks}
                            watchNotebookStatus={watchNotebookStatus}
                            imageStreams={imageList?.items ?? []}
                            pvcList={pvcList}
                            setAttachStorageModalOpen={() => handleAttachStorageModalOpen(notebook)}
                            setModalOpen={setCreateWorkspaceModalOpen}
                            setActiveNotebook={setSelectedWorkspace}
                            onDelete={(workspace) =>
                              deleteNotebook(projectName, workspace.metadata.name)
                                .then(() => {
                                  dispatchSuccess('Delete Workspace Successfully');
                                  loadNotebooks();
                                  loadPvcs();
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
                        <Title headingLevel="h3" size="xl" id="storage">
                          Storage
                        </Title>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSelectedStorage(null);
                            setAddStorageModalOpen(true);
                          }}
                        >
                          Add storage
                        </Button>
                      </FlexItem>
                    </Flex>
                    {!listEmpty(pvcList) && !listEmpty(storageClassList) ? (
                      <DataList
                        className="odh-data-projects__data-list"
                        isCompact
                        aria-label="Data project storage list"
                      >
                        {pvcList?.items.map((pvc) => (
                          <PvcListItem
                            key={`pvc-${pvc.metadata.name}`}
                            dataKey={`pvc-${pvc.metadata.name}`}
                            pvc={pvc}
                            updatePvc={(pvc: PersistentVolumeClaim) => {}}
                            connections={connections}
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
                      <Empty type="storage" />
                    )}
                    <Flex>
                      <FlexItem>
                        <Title headingLevel="h3" size="xl" id="data-sources">
                          Data Sources
                        </Title>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSelectedDataSource(null);
                            setAddDataSourceModalOpen(true);
                          }}
                        >
                          Add data source
                        </Button>
                      </FlexItem>
                    </Flex>
                    {!listEmpty(objectStorageList) && !listEmpty(objectStorageList) ? (
                      <DataList
                        className="odh-data-projects__data-list"
                        isCompact
                        aria-label="Data project data source list"
                      >
                        {objectStorageList?.items.map((objectStorage) => (
                          <ObjectStorageListItem
                            key={`object-storage-${objectStorage.metadata.name}`}
                            dataKey={`pvc-${objectStorage.metadata.name}`}
                            objectStorage={objectStorage}
                            setModalOpen={setCreateWorkspaceModalOpen}
                            onDelete={(os) => {
                              deleteSecret(projectName, os.metadata.name).then(loadObjectStorage);
                            }}
                            handleListItemToggle={handleListItemToggle}
                            expandedItems={expandedListItems}
                          />
                        ))}
                      </DataList>
                    ) : (
                      <Empty type="data sources" />
                    )}
                    <Flex>
                      <FlexItem>
                        <Title headingLevel="h3" size="xl" id="model-serving">
                          Model serving
                        </Title>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setModelServingModalOpen(true);
                          }}
                        >
                          Serve a model
                        </Button>
                      </FlexItem>
                    </Flex>
                    {!listEmpty(predictorList) && !listEmpty(predictorList) ? (
                      <DataList
                        className="odh-data-projects__data-list"
                        isCompact
                        aria-label="Data project predictor list"
                      >
                        {predictorList?.items.map((predictor) => (
                          <PredictorListItem
                            key={`predictor-${predictor.metadata.name}`}
                            dataKey={`predictor-${predictor.metadata.name}`}
                            predictor={predictor}
                            route={servingRoute}
                            servingRuntimeList={undefined}
                            setModalOpen={setModelServingModalOpen}
                            onDelete={(predictor) => {
                              deletePredictor(projectName, predictor.metadata.name).then(
                                loadServing,
                              );
                            }}
                            handleListItemToggle={handleListItemToggle}
                            expandedItems={expandedListItems}
                          />
                        ))}
                      </DataList>
                    ) : (
                      <Empty type="served models" />
                    )}
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
                    <TabTitleText>Permissions</TabTitleText>
                  </>
                }
                id={`${project.metadata.name}-tab-permissions`}
              >
                <PermissionTabContent />
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
                id={`${project.metadata.name}-tab-settings`}
              >
                Settings
              </Tab>
            </Tabs>
          </PageSection>
        ) : null}
      </ApplicationsPage>
      <WorkspaceModal
        project={project}
        odhConfig={odhConfig}
        imageStreams={listEmpty(imageList) ? [] : imageList?.items ?? []}
        pvcList={pvcList}
        notebook={selectedWorkspace}
        isModalOpen={isCreateWorkspaceModalOpen}
        onClose={handleCreateWorkspaceModalClose}
        dispatchError={dispatchError}
        dispatchSuccess={dispatchSuccess}
      />
      <AttachStorageModal
        notebook={selectedWorkspace}
        notebookList={notebookList}
        pvcList={pvcList}
        isModalOpen={isAttachStorageModalOpen}
        onClose={handleAttachStorageModalClose}
      />
      <StorageModal
        project={project}
        notebookList={notebookList}
        storageClassList={storageClassList}
        storage={selectedStorage}
        isModalOpen={isAddStorageModalOpen}
        onClose={handleAddStorageModalClose}
      />
      <DataSourceModal
        project={project}
        notebookList={notebookList}
        storageClassList={storageClassList}
        data={selectedDataSource}
        isModalOpen={isAddDataSourceModalOpen}
        onClose={handleAddDataSourceModalClose}
        dispatchError={dispatchError}
      />
      <ModelServingModal
        project={project}
        notebookList={notebookList}
        pvcList={pvcList}
        objectStorageList={objectStorageList}
        isModalOpen={isModelServingModalOpen}
        onClose={handleModelServingModalClose}
        dispatchError={dispatchError}
      />
    </>
  );
});

DataProjectDetails.displayName = 'DataProjectDetails';

export default DataProjectDetails;
