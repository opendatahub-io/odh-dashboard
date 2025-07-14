import {
  Menu,
  MenuContent,
  MenuItem,
  Dropdown,
  MenuList,
  MenuToggle,
  Spinner,
} from '@patternfly/react-core';
import React from 'react';
import { Connection } from '#~/concepts/connectionTypes/types';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import useServingConnections from '#~/pages/projects/screens/detail/connections/useServingConnections';
import { ModelLocationType } from './useRegisterModelData';

type ConnectionDropdownProps = {
  type: ModelLocationType;
  onSelect: (connectionInfo: Connection) => void;
  project?: string;
  selectedConnection?: Connection;
};
export const ConnectionDropdown = ({
  type,
  onSelect,
  project,
  selectedConnection,
}: ConnectionDropdownProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [connections, connectionsLoaded, connectionsLoadError] = useServingConnections(project);

  const onToggle = () => {
    setIsOpen(!isOpen);
  };

  const filteredConnections =
    type === ModelLocationType.ObjectStorage
      ? connections.filter((c) => c.data?.AWS_S3_BUCKET)
      : connections.filter((c) => c.data?.URI);

  const getToggleContent = () => {
    if (!project) {
      return 'Select a project to view its available connections';
    }
    if (connectionsLoadError) {
      return 'Error loading connections';
    }
    if (!connectionsLoaded) {
      return (
        <>
          <Spinner size="sm" /> Loading Connections for the selected project...
        </>
      );
    }
    if (!filteredConnections.length) {
      return 'No available connections';
    }
    if (selectedConnection) {
      return getDisplayNameFromK8sResource(selectedConnection);
    }
    return 'Select connection';
  };

  const onSelectConnection = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    option?: string | number | null,
  ) => {
    setIsOpen(false);
    if (typeof option === 'string') {
      const value = connections.find((d) => d.metadata.name === option);
      if (!value) {
        return;
      }
      onSelect(value);
    }
  };
  return (
    <Dropdown
      onOpenChange={(isOpened) => setIsOpen(isOpened)}
      toggle={(toggleRef) => (
        <MenuToggle
          isDisabled={!filteredConnections.length}
          isFullWidth
          data-testid="select-connection"
          ref={toggleRef}
          onClick={onToggle}
          isExpanded={isOpen}
        >
          {getToggleContent()}
        </MenuToggle>
      )}
      isOpen={isOpen}
      popperProps={{ appendTo: 'inline' }}
    >
      <Menu onSelect={onSelectConnection} isScrollable isPlain>
        <MenuContent>
          <MenuList>
            {filteredConnections.map((dataItem) => (
              <MenuItem key={dataItem.metadata.name} itemId={dataItem.metadata.name}>
                {getDisplayNameFromK8sResource(dataItem)}
              </MenuItem>
            ))}
          </MenuList>
        </MenuContent>
      </Menu>
    </Dropdown>
  );
};
