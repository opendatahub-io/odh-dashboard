import * as React from 'react';
import {
  Button,
  Dropdown,
  DropdownItem,
  KebabToggle,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';

import './DataProjectsToolbar.scss';

type DataProjectsTableToolbarProps = {
  setCreateProjectModalOpen: (isOpen: boolean) => void;
};

const DataProjectsTableToolbar: React.FC<DataProjectsTableToolbarProps> = ({
  setCreateProjectModalOpen,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const dropdownItems = [
    <DropdownItem key={1}>Action 1</DropdownItem>,
    <DropdownItem key={2}>Action 2</DropdownItem>,
  ];

  const onDropdownSelect = (event) => {
    setIsDropdownOpen(false);
  };

  const onDropdownToggle = (isOpen) => {
    setIsDropdownOpen(isOpen);
  };

  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem>
          <Button variant="primary" onClick={() => setCreateProjectModalOpen(true)}>
            Create data projects
          </Button>
        </ToolbarItem>
        <ToolbarItem>
          <Dropdown
            onSelect={onDropdownSelect}
            isOpen={isDropdownOpen}
            toggle={
              <KebabToggle onToggle={onDropdownToggle} id="projects-table-toolbar-dropdown" />
            }
            isPlain
            dropdownItems={dropdownItems}
          />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default DataProjectsTableToolbar;
