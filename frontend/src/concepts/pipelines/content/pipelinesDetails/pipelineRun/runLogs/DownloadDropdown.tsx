import React from 'react';
import { Dropdown, DropdownItem, DropdownToggle } from '@patternfly/react-core/deprecated';
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
      isPlain
      position="right"
      toggle={
        <DropdownToggle
          className="pf-v5-u-px-sm"
          style={{ width: '60px' }}
          id="download-steps-logs-toggle"
          onToggle={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
        >
          <DownloadIcon />
        </DropdownToggle>
      }
      isOpen={isDownloadDropdownOpen}
      dropdownItems={[
        <DropdownItem
          isDisabled={isSingleStepLogsEmpty}
          key="current-container-logs"
          onClick={onDownload}
        >
          Download current step log
        </DropdownItem>,
        <DropdownItem key="all-container-logs" onClick={onDownloadAll}>
          Download all step logs
        </DropdownItem>,
      ]}
    />
  );
};
export default DownloadDropdown;
