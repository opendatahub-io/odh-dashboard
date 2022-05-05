import * as React from 'react';
import {
  Button,
  Dropdown,
  DropdownItem,
  KebabToggle,
  Pagination,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';

import './DataProjectsToolbar.scss';

type DataProjectsTableToolbarProps = {
  setCreateProjectModalOpen: (isOpen: boolean) => void;
  projectsCount: number;
};

const DataProjectsTableToolbar: React.FC<DataProjectsTableToolbarProps> = ({
  setCreateProjectModalOpen,
  projectsCount,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const onSetPage = (event, pageNumber) => {
    setPageNumber(pageNumber);
  };
  const onPerPageSelect = (event, perPage) => {
    setPerPage(perPage);
  };

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
        <ToolbarItem variant="pagination" alignment={{ default: 'alignRight' }}>
          <Pagination
            itemCount={projectsCount}
            page={pageNumber}
            onSetPage={onSetPage}
            perPage={perPage}
            onPerPageSelect={onPerPageSelect}
          />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default DataProjectsTableToolbar;
