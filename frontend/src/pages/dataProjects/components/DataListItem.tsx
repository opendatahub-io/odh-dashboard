import * as React from 'react';
import {
  Button,
  DataListAction,
  DataListCell,
  DataListContent,
  DataListItem as PFDataListItem,
  DataListItemCells,
  DataListItemRow,
  DataListToggle,
  Dropdown,
  DropdownItem,
  Flex,
  FlexItem,
  KebabToggle,
  List,
  ListItem,
  Progress,
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
import { Container, ImageStream, ImageStreamTag, Notebook } from '../../../types';
import { patchDataProjectNotebook } from '../../../services/dataProjectsService';

type DataListItemProps = {
  dataKey: string;
  data: any;
  updateNotebook: (notebook: Notebook) => void;
  imageStreams: ImageStream[];
  setModalOpen: (isOpen: boolean) => void;
  setActiveData: (data: any) => void;
  onDelete: (notebook: Notebook) => void;
  handleListItemToggle: (id: string) => void;
  expandedItems: Set<string>;
};

const DataListItem: React.FC<DataListItemProps> = React.memo(
  ({
    dataKey,
    data,
    setModalOpen,
    setActiveData,
    onDelete,
    handleListItemToggle,
    expandedItems,
  }) => {
    const [isDropdownOpen, setDropdownOpen] = React.useState(false);
    const [isExpanded, setExpanded] = React.useState(expandedItems.has(dataKey));

    React.useEffect(() => {
      if (dataKey) {
        if (isExpanded !== expandedItems.has(dataKey)) {
          setExpanded(expandedItems.has(dataKey));
        }
      }
    }, [expandedItems, dataKey, isExpanded]);

    const empty = React.useCallback(
      () => (
        <PFDataListItem>
          <DataListItemRow>
            <DataListItemCells
              dataListCells={[
                <DataListCell key={`${dataKey}-unavailable`}>Data unavailable</DataListCell>,
              ]}
            />
            <DataListAction
              aria-label={`Workspace ${data.metadata.name} Delete`}
              aria-labelledby={`${dataKey}-delete`}
              id={`${dataKey}-delete`}
              isPlainButtonAction
            >
              <Button isInline onClick={() => onDelete(data)}>
                Delete
              </Button>
            </DataListAction>
          </DataListItemRow>
        </PFDataListItem>
      ),
      [dataKey, data, onDelete],
    );

    const handleEdit = () => {
      setActiveData(data);
      setModalOpen(true);
    };

    const dropdownItems = [
      <DropdownItem onClick={handleEdit} key={`${dataKey}-edit`} component="button">
        Edit
      </DropdownItem>,
      <DropdownItem onClick={() => onDelete(data)} key={`${dataKey}-delete`} component="button">
        Delete
      </DropdownItem>,
    ];

    return (
      <PFDataListItem className="odh-data-projects__data-list-item" isExpanded={isExpanded}>
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
                  {data.metadata.name}
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
            aria-label={`Workspace ${data.metadata.name} Action`}
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
          aria-label={`Workspace ${data.metadata.name} Expanded Content`}
          id={`${dataKey}-expanded-content`}
          isHidden={!isExpanded}
        >
          <DataListItemCells
            className="odh-data-projects__data-list-item-content"
            dataListCells={[
              <DataListCell width={5} key={`${dataKey}-notebook-storage`}>
                <p className="m-bold">Storage</p>
                <List className="odh-data-projects__storage-progress" isPlain>
                  <ListItem>
                    <Flex>
                      <FlexItem>
                        <span>Enviro1_default_storage</span>
                      </FlexItem>
                      <FlexItem align={{ default: 'alignRight' }}>
                        <Button variant="link" isSmall isInline>
                          Access
                        </Button>
                      </FlexItem>
                    </Flex>
                  </ListItem>
                  <ListItem>
                    <Split hasGutter>
                      <SplitItem>
                        <span>1.75GB</span>
                      </SplitItem>
                      <SplitItem isFilled>
                        <Progress
                          aria-label={`${data.metadata.name} Storage Progress`}
                          measureLocation="outside"
                          value={87.5}
                          label="2GB"
                        />
                      </SplitItem>
                    </Split>
                  </ListItem>
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
                <p>{`${container.resources.limits.cpu} CPU, ${container.resources.limits.memory}`}</p>
                <br />
                <p className="m-bold">Requests</p>
                <p>{`${container.resources.requests.cpu} CPU, ${container.resources.requests.memory}`}</p>
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-content-empty-1`} />,
              <DataListCell width={1} key={`${dataKey}-content-empty-2`} />,
            ]}
          />
        </DataListContent>
      </PFDataListItem>
    );
  },
);

DataListItem.displayName = 'DataListItem';

export default DataListItem;
