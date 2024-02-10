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
          data-testid="download-steps-toggle"
          className="pf-v5-u-px-sm"
          style={{ width: '60px' }}
          aria-label="Download step logs"
          id="download-steps-logs-toggle"
          onToggle={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
        >
          <DownloadIcon />
        </DropdownToggle>
      }
      isOpen={isDownloadDropdownOpen}
      dropdownItems={[
        <DropdownItem
          data-testid="download-current-step-logs"
          isDisabled={isSingleStepLogsEmpty}
          key="current-step-logs"
          onClick={onDownload}
        >
          Download current step log
        </DropdownItem>,
        <DropdownItem key="all-step-logs" onClick={onDownloadAll}>
          Download all step logs
        </DropdownItem>,
      ]}
    />
  );
};
export default DownloadDropdown;
