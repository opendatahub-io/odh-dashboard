import React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
  KebabToggle,
} from '@patternfly/react-core/deprecated';
import { Truncate } from '@patternfly/react-core';

type DownloadDropdownProps = {
  onDownload: () => void;
  onDownloadAll: () => void;
  isSmallScreen: boolean;
  isSingleStepLogsEmpty: boolean;
};

const DownloadDropdown: React.FC<DownloadDropdownProps> = ({
  onDownload,
  onDownloadAll,
  isSmallScreen,
  isSingleStepLogsEmpty,
}) => {
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = React.useState(false);

  return isSmallScreen ? (
    <Dropdown
      toggle={<KebabToggle onToggle={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)} />}
      isOpen={isDownloadDropdownOpen}
      isPlain
      dropdownItems={[
        <DropdownItem
          isDisabled={isSingleStepLogsEmpty}
          key="current-container-logs"
          onClick={onDownload}
        >
          <Truncate content="Download current step log" />
        </DropdownItem>,
        <DropdownItem key="all-container-logs" onClick={onDownloadAll}>
          <Truncate content="Download all step logs" />
        </DropdownItem>,
      ]}
    />
  ) : (
    <Dropdown
      toggle={
        <DropdownToggle
          id="download-steps-logs-toggle"
          onToggle={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
        >
          Download
        </DropdownToggle>
      }
      isOpen={isDownloadDropdownOpen}
      dropdownItems={[
        <DropdownItem
          isDisabled={isSingleStepLogsEmpty}
          key="current-container-logs"
          onClick={onDownload}
        >
          <Truncate content="Current step log" />
        </DropdownItem>,
        <DropdownItem key="all-container-logs" onClick={onDownloadAll}>
          <Truncate content="All step logs" />
        </DropdownItem>,
      ]}
    />
  );
};
export default DownloadDropdown;
