import * as React from 'react';
import {
  Button,
  DataListAction,
  DataListCell,
  DataListContent,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  DataListToggle,
  Dropdown,
  DropdownItem,
  Flex,
  FlexItem,
  GridItem,
  KebabToggle,
  List,
  ListItem,
  Progress,
  Radio,
  Split,
  SplitItem,
  Switch,
  Title,
} from '@patternfly/react-core';
import '../DataProjects.scss';
import { ExternalLinkAltIcon, PlusCircleIcon } from '@patternfly/react-icons';
import {
  getNameVersionString,
  getTagDescription,
  getTagDependencies,
  getImageStreamByContainer,
  getNumGpus,
  getContainerStatus,
} from '../../../utilities/imageUtils';
import {
  Container,
  ImageStream,
  ImageStreamTag,
  Notebook,
  PersistentVolumeClaimList,
  Volume,
} from '../../../types';
import { patchDataProjectNotebook } from '../../../services/dataProjectsService';

type WorkspaceListItemProps = {
  dataKey: string;
  notebook: Notebook;
  updateNotebook: (notebook: Notebook) => void;
  imageStreams: ImageStream[];
  pvcList: PersistentVolumeClaimList | undefined;
  setModalOpen: (isOpen: boolean) => void;
  setActiveEnvironment: (notebook: Notebook) => void;
  onDelete: (notebook: Notebook) => void;
  handleListItemToggle: (id: string) => void;
  expandedItems: Set<string>;
};

const WorkspaceListItem: React.FC<WorkspaceListItemProps> = React.memo(
  ({
    dataKey,
    notebook,
    updateNotebook,
    imageStreams,
    pvcList,
    setModalOpen,
    setActiveEnvironment,
    onDelete,
    handleListItemToggle,
    expandedItems,
  }) => {
    const [isDropdownOpen, setDropdownOpen] = React.useState(false);
    const [isExpanded, setExpanded] = React.useState(expandedItems.has(dataKey));
    const [updateInProgress, setUpdateInProgress] = React.useState(false);

    React.useEffect(() => {
      if (dataKey) {
        if (isExpanded !== expandedItems.has(dataKey)) {
          setExpanded(expandedItems.has(dataKey));
        }
      }
    }, [expandedItems, dataKey, isExpanded]);

    const empty = React.useCallback(
      () => (
        <DataListItem>
          <DataListItemRow>
            <DataListItemCells
              dataListCells={[
                <DataListCell key={`${dataKey}-unavailable`}>Workspace unavailable</DataListCell>,
              ]}
            />
            <DataListAction
              aria-label={`Workspace ${notebook.metadata.name} Delete`}
              aria-labelledby={`${dataKey}-delete`}
              id={`${dataKey}-delete`}
              isPlainButtonAction
            >
              <Button isInline onClick={() => onDelete(notebook)}>
                Delete
              </Button>
            </DataListAction>
          </DataListItemRow>
        </DataListItem>
      ),
      [dataKey, notebook, onDelete],
    );

    const containers: Container[] = notebook.spec?.template?.spec?.containers || [];
    const notebookContainer: Container | undefined = containers.find(
      (container) => container.name === notebook.metadata.name,
    );
    if (!notebookContainer) {
      return empty();
    }
    const imageStream: ImageStream | undefined = getImageStreamByContainer(
      imageStreams,
      notebookContainer,
    );
    const tag: ImageStreamTag | undefined = imageStream?.spec?.tags?.find(
      (tag) => tag.from.name === notebookContainer.image,
    );
    if (!imageStream || !tag) {
      return empty();
    }

    const volumeList =
      notebookContainer?.volumeMounts?.map((volumeMount) => {
        const volume = notebook.spec.template.spec.volumes?.find(
          (v) => v.name === volumeMount.name,
        );
        const pvc = volume?.persistentVolumeClaim
          ? pvcList?.items?.find(
              (pvc) => pvc.metadata.name === volume?.persistentVolumeClaim?.claimName,
            )
          : undefined;

        const display = `${volumeMount.name} (${volumeMount.mountPath})`;
        // if (volume?.persistentVolumeClaim) {
        //   display = `${volumeMount.name} ${volumeMount.mountPath}`;
        // } else if (volume?.emptyDir) {
        //   display = 'Ephemeral';
        // }

        return { display, volumeMount, volume, pvc };
      }) || [];

    const numGpus = getNumGpus(notebookContainer);
    const tagSoftware = getTagDescription(tag);
    const tagDependencies = getTagDependencies(tag);
    const notebookStatus = getContainerStatus(notebook);
    const isNotebookStarted = notebookStatus === 'Running' || notebookStatus === 'Starting';
    const isNotebookRunning = notebookStatus === 'Running';

    const getResourceAnnotation = (
      resource: Notebook | ImageStream,
      annotationKey: string,
    ): string => resource?.metadata.annotations?.[annotationKey] ?? '';

    const handleNotebookRunningChange = (isChecked: boolean) => {
      setUpdateInProgress(true);
      const updateData = isChecked ? { stopped: false } : { stopped: true };
      patchDataProjectNotebook(notebook.metadata.namespace, notebook.metadata.name, updateData)
        .then((notebook) => {
          setUpdateInProgress(false);
          updateNotebook(notebook);
        })
        .catch(() => {
          setUpdateInProgress(false);
        });
    };

    const handleEdit = () => {
      setActiveEnvironment(notebook);
      setModalOpen(true);
    };

    const dropdownItems = [
      <DropdownItem onClick={handleEdit} key={`${dataKey}-edit`} component="button">
        Edit
      </DropdownItem>,
      <DropdownItem onClick={() => onDelete(notebook)} key={`${dataKey}-delete`} component="button">
        Delete
      </DropdownItem>,
    ];

    return (
      <DataListItem className="odh-data-projects__data-list-item" isExpanded={isExpanded}>
        <DataListItemRow>
          <DataListToggle
            onClick={() => handleListItemToggle(dataKey)}
            isExpanded={isExpanded}
            id={`${dataKey}-toggle`}
          />
          <DataListItemCells
            dataListCells={[
              <DataListCell width={5} key={`${dataKey}-name-descriptions`}>
                <Title size="md" headingLevel="h4">
                  {notebook.metadata.name}
                </Title>
                {getResourceAnnotation(notebook, 'opendatahub.io/description')}
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-image`}>
                {getResourceAnnotation(imageStream, 'opendatahub.io/notebook-image-name')}
                {tagSoftware && <p className="odh-data-projects__help-text">{tagSoftware}</p>}
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-gpu-size`}>
                {numGpus ? `${numGpus} GPU` : ''}
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-status`}>
                <Switch
                  id={`${dataKey}-status-switch`}
                  label={getContainerStatus(notebook)}
                  isChecked={isNotebookStarted}
                  onChange={handleNotebookRunningChange}
                  isDisabled={updateInProgress}
                />
              </DataListCell>,
              <DataListCell width={1} key={`${dataKey}-open-external-link`}>
                {isNotebookRunning ? (
                  <Button
                    isInline
                    variant="link"
                    icon={<ExternalLinkAltIcon />}
                    iconPosition="right"
                  >
                    <a
                      href={notebook.metadata.annotations?.['opendatahub.io/link'] ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open
                    </a>
                  </Button>
                ) : null}
              </DataListCell>,
            ]}
          />
          <DataListAction
            aria-label={`Workspace ${notebook.metadata.name} Action`}
            aria-labelledby={`${dataKey}-action`}
            id={`${dataKey}-action`}
            isPlainButtonAction
          >
            <Dropdown
              isPlain
              position="right"
              isOpen={isDropdownOpen}
              onSelect={() => setDropdownOpen(false)}
              toggle={<KebabToggle onToggle={(open) => setDropdownOpen(open)} />}
              dropdownItems={dropdownItems}
            />
          </DataListAction>
        </DataListItemRow>
        <DataListContent
          hasNoPadding
          aria-label={`Workspace ${notebook.metadata.name} Expanded Content`}
          id={`${dataKey}-expanded-content`}
          isHidden={!isExpanded}
        >
          <DataListItemCells
            className="odh-data-projects__data-list-item-content"
            dataListCells={[
              <DataListCell width={5} key={`${dataKey}-notebook-storage`}>
                <p className="m-bold">Storage</p>
                <List className="odh-data-projects__storage-progress" isPlain>
                  {volumeList?.map((v) => (
                    <>
                      <ListItem key={`${notebook.metadata.name}-${v.volumeMount.name}`}>
                        <Flex>
                          <FlexItem>
                            <span>{v.display}</span>
                          </FlexItem>
                          {v?.pvc ? (
                            <FlexItem align={{ default: 'alignRight' }}>
                              <Button variant="link" isSmall isInline>
                                Access
                              </Button>
                            </FlexItem>
                          ) : null}
                        </Flex>
                      </ListItem>
                      {v?.pvc ? (
                        <ListItem>
                          <Split hasGutter>
                            <SplitItem>
                              {/*TODO: Retrieve values from prometheus
                              /api/prometheus-tenancy/api/v1/query?namespace=my-namespace&query=kubelet_volume_stats_used_bytes{persistentvolumeclaim='my-pv'}
                              */}
                              <span>{'0.1GB'}</span>
                            </SplitItem>
                            <SplitItem isFilled>
                              <Progress
                                aria-label={`${v.volumeMount.name} Storage Progress`}
                                measureLocation="outside"
                                value={2}
                                label={v.pvc.spec.resources.requests.storage}
                              />
                            </SplitItem>
                          </Split>
                        </ListItem>
                      ) : (
                        <ListItem>
                          <span className="odh-data-projects__help-text">Ephemeral</span>
                        </ListItem>
                      )}
                    </>
                  ))}
                  <ListItem>
                    <Button variant="link" icon={<PlusCircleIcon />} isSmall isInline>
                      Add storage
                    </Button>
                  </ListItem>
                </List>
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-notebook-dependency`}>
                <p className="m-bold">Packages</p>
                {tagDependencies.length !== 0
                  ? tagDependencies.map((dependency, index) => (
                      <p key={`${dataKey}-dependency-${index}`}>
                        {getNameVersionString(dependency)}
                      </p>
                    ))
                  : null}
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-requests-limits`}>
                <p className="m-bold">Limits</p>
                <p>{`${notebookContainer.resources.limits.cpu} CPU, ${notebookContainer.resources.limits.memory}`}</p>
                <br />
                <p className="m-bold">Requests</p>
                <p>{`${notebookContainer.resources.requests.cpu} CPU, ${notebookContainer.resources.requests.memory}`}</p>
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-content-empty-1`} />,
              <DataListCell width={1} key={`${dataKey}-content-empty-2`} />,
            ]}
          />
        </DataListContent>
      </DataListItem>
    );
  },
);

WorkspaceListItem.displayName = 'WorkspaceListItem';

export default WorkspaceListItem;
