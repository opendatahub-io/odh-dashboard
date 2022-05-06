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
  KebabToggle,
  Title,
} from '@patternfly/react-core';
import '../DataProjects.scss';
import { Secret } from '../../../types';
import { CubeIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';

type ObjectStorageListItemProps = {
  dataKey: string;
  objectStorage: Secret;
  // updateObjectStorage: (objectStorage: Secret) => void;
  setModalOpen: (isOpen: boolean) => void;
  onDelete: (objectStorage: Secret) => void;
  handleListItemToggle: (id: string) => void;
  expandedItems: Set<string>;
};

const ObjectStorageListItem: React.FC<ObjectStorageListItemProps> = React.memo(
  ({
    dataKey,
    objectStorage,
    // updateObjectStorage,
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

    const getResourceAnnotation = (resource: Secret, annotationKey: string): string =>
      resource?.metadata.annotations?.[annotationKey] ?? '';

    const handleEdit = () => {
      console.log('ObjectStorageListItem handleEdit');
    };

    const dropdownItems = [
      <DropdownItem onClick={handleEdit} key={`${dataKey}-edit`} component="button">
        Edit
      </DropdownItem>,
      <DropdownItem
        onClick={() => onDelete(objectStorage)}
        key={`${dataKey}-delete`}
        component="button"
      >
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
                  {objectStorage.metadata.name}
                </Title>
                {getResourceAnnotation(objectStorage, 'opendatahub.io/description')}
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-object-storage-type`}>
                <p>
                  <CubeIcon /> Object storage
                </p>
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-connections`}>
                <p className="m-bold">Connections</p>
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
            aria-label={`Volume ${objectStorage.metadata.name} Action`}
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
          aria-label={`Volume ${objectStorage.metadata.name} Expanded Content`}
          id={`${dataKey}-expanded-content`}
          isHidden={!isExpanded}
        >
          <DataListItemCells
            className="odh-data-projects__data-list-item-content"
            dataListCells={[
              <DataListCell width={3} key={`${dataKey}-object-storage`}>
                <p className="m-bold">Endpoint</p>
                <p>{atob(objectStorage?.data?.endpoint_url || '')}</p>
              </DataListCell>,
              <DataListCell width={2} key={`${dataKey}-object-storage-type-detail`}>
                <p className="m-bold">Provider</p>
                <p>
                  {(objectStorage?.data?.endpoint_url || '').includes('amazon')
                    ? 'AWS S3'
                    : 'Object Store'}
                </p>
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

ObjectStorageListItem.displayName = 'ObjectStorageListItem';

export default ObjectStorageListItem;
