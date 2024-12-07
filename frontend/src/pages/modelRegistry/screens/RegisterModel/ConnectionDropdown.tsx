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
import { DataConnection } from '~/pages/projects/types';
import { getDataConnectionDisplayName } from '~/pages/projects/screens/detail/data-connections/utils';
// TODO: temporarily importing across pages so not to interfere with ongoing dataconnection work
import useDataConnections from '~/pages/projects/screens/detail/data-connections/useDataConnections';

type ConnectionDropdownProps = {
  onSelect: (connectionInfo: DataConnection) => void;
  project?: string;
  selectedConnection?: DataConnection;
};
export const ConnectionDropdown = ({
  onSelect,
  project,
  selectedConnection,
}: ConnectionDropdownProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [connections, connectionsLoaded, connectionsLoadError] = useDataConnections(project);

  const onToggle = () => {
    setIsOpen(!isOpen);
  };

  const filteredConnections = connections.filter((c) => c.data.data?.AWS_S3_BUCKET);

  const getToggleContent = () => {
    if (!project) {
      return 'Select a project to view its available data connections';
    }
    if (connectionsLoadError) {
      return 'Error loading connections';
    }
    if (!connectionsLoaded) {
      return (
        <>
          <Spinner size="sm" /> Loading Data Connections for the selected project...
        </>
      );
    }
    if (!filteredConnections.length) {
      return 'No available data connections';
    }
    if (selectedConnection) {
      return getDataConnectionDisplayName(selectedConnection);
    }
    return 'Select data connection';
  };

  const onSelectConnection = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    option?: string | number | null,
  ) => {
    setIsOpen(false);
    if (typeof option === 'string') {
      const value = connections.find((d) => d.data.metadata.name === option);
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
          data-testid="select-data-connection"
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
              <MenuItem key={dataItem.data.metadata.name} itemId={dataItem.data.metadata.name}>
                {getDataConnectionDisplayName(dataItem)}
              </MenuItem>
            ))}
          </MenuList>
        </MenuContent>
      </Menu>
    </Dropdown>
  );
};
