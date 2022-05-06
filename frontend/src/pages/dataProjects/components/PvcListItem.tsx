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
  KebabToggle,
  List,
  ListItem,
  Progress,
  Split,
  SplitItem,
  Title,
} from '@patternfly/react-core';
import '../DataProjects.scss';
import { PersistentVolumeClaim } from '../../../types';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

type PvcListItemProps = {
  dataKey: string;
  pvc: PersistentVolumeClaim;
  updatePvc: (pvc: PersistentVolumeClaim) => void;
  connections: Map<string, string>;
  setModalOpen: (isOpen: boolean) => void;
  onDelete: (pvc: PersistentVolumeClaim) => void;
  handleListItemToggle: (id: string) => void;
  expandedItems: Set<string>;
};

const PvcListItem: React.FC<PvcListItemProps> = React.memo(
  ({
    dataKey,
    pvc,
    updatePvc,
    connections,
    setModalOpen,
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

    const getResourceAnnotation = (
      resource: PersistentVolumeClaim,
      annotationKey: string,
    ): string => resource?.metadata.annotations?.[annotationKey] ?? '';

    const handleEdit = () => {
      console.log('PvcListItem handleEdit');
    };

    const dropdownItems = [
      <DropdownItem onClick={handleEdit} key={`${dataKey}-edit`} component="button">
        Edit
      </DropdownItem>,
      <DropdownItem onClick={() => onDelete(pvc)} key={`${dataKey}-delete`} component="button">
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
              <DataListCell width={3} key={`${dataKey}-name-descriptions`}>
                <Title size="md" headingLevel="h4">
                  {pvc.metadata.name}
                </Title>
                {getResourceAnnotation(pvc, 'opendatahub.io/description')}
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-storage-type`}>
                <p>
                  <i className="fas fa-hdd" /> Persistent Volume
                </p>
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-connections`}>
                <p className="m-bold">Connections</p>
                {connections.get(pvc.metadata.name)}
              </DataListCell>,
              <DataListCell width={1} key={`${dataKey}-access-external-link`}>
                <Button isInline variant="link" icon={<ExternalLinkAltIcon />} iconPosition="right">
                  <a href={'#'} target="_blank" rel="noopener noreferrer">
                    Access
                  </a>
                </Button>
              </DataListCell>,
            ]}
          />
          <DataListAction
            aria-label={`Volume ${pvc.metadata.name} Action`}
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
          aria-label={`Volume ${pvc.metadata.name} Expanded Content`}
          id={`${dataKey}-expanded-content`}
          isHidden={!isExpanded}
        >
          <DataListItemCells
            className="odh-data-projects__data-list-item-content"
            dataListCells={[
              <DataListCell width={3} key={`${dataKey}-pvc-storage`}>
                <List className="odh-data-projects__storage-progress" isPlain>
                  <p className="m-bold">Size</p>
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
                          aria-label={`${pvc.metadata.name} Storage Progress`}
                          measureLocation="outside"
                          value={2}
                          label={pvc.spec.resources.requests.storage}
                        />
                      </SplitItem>
                    </Split>
                  </ListItem>
                </List>
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-storage-type-detail`}>
                <p className="m-bold">Type</p>
                <p>gp2</p>
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-content-empty-1`} />,
              <DataListCell width={1} key={`${dataKey}-access-empty-2`} />,
            ]}
          />
        </DataListContent>
      </DataListItem>
    );
  },
);

PvcListItem.displayName = 'PvcListItem';

export default PvcListItem;
