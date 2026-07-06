import React from 'react';
import { Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';

type DownloadDropdownProps = {
  onDownload: () => void;
  onDownloadAll: () => void;
  isSingleStepLogsEmpty: boolean;
};

const DownloadDropdown: React.FC<DownloadDropdownProps> = ({
  onDownload,
  onDownloadAll,
  isSingleStepLogsEmpty,
}) => {
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = React.useState(false);

  return (
    <Dropdown
      popperProps={{ position: 'right' }}
      onOpenChange={(isOpenChange) => setIsDownloadDropdownOpen(isOpenChange)}
      shouldFocusToggleOnSelect
      toggle={(toggleRef) => (
        <MenuToggle
          data-testid="download-steps-toggle"
          className="pf-v6-u-px-sm"
          ref={toggleRef}
          variant="plainText"
          style={{ width: '70px' }}
          aria-label="Download step logs"
          id="download-steps-logs-toggle"
          onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
          isExpanded={isDownloadDropdownOpen}
        >
          <DownloadIcon />
        </MenuToggle>
      )}
      isOpen={isDownloadDropdownOpen}
    >
      <DropdownList>
        <DropdownItem
          data-testid="download-current-step-logs"
          isDisabled={isSingleStepLogsEmpty}
          key="current-step-logs"
          onClick={onDownload}
        >
          Download current step log
        </DropdownItem>
        <DropdownItem key="all-step-logs" onClick={onDownloadAll}>
          Download all step logs
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};
export default DownloadDropdown;
