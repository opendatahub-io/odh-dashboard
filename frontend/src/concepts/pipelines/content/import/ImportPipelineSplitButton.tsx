import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleAction,
  MenuToggleProps,
  Tooltip,
} from '@patternfly/react-core';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineImportModal from '~/concepts/pipelines/content/import/PipelineImportModal';
import PipelineVersionImportModal from '~/concepts/pipelines/content/import/PipelineVersionImportModal';

type ImportPipelineSplitButtonProps = {
  onImportPipeline?: (pipeline: PipelineKF) => void;
  onImportPipelineVersion?: (pipelineVersion: PipelineVersionKF) => void;
  variant?: MenuToggleProps['variant'];
  disable?: boolean;
  disableUploadVersion?: boolean;
};

const ImportPipelineSplitButton: React.FC<ImportPipelineSplitButtonProps> = ({
  onImportPipeline,
  onImportPipelineVersion,
  disable,
  disableUploadVersion,
  variant = 'primary',
}) => {
  const { apiAvailable, refreshAllAPI } = usePipelinesAPI();
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);
  const [isPipelineModalOpen, setPipelineModalOpen] = React.useState(false);
  const [isPipelineVersionModalOpen, setPipelineVersionModalOpen] = React.useState(false);
  const tooltipRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <Dropdown
        isOpen={isDropdownOpen}
        onSelect={() => setDropdownOpen(false)}
        onOpenChange={(isOpen) => setDropdownOpen(isOpen)}
        toggle={(toggleRef) => (
          <MenuToggle
            isFullWidth
            variant={variant}
            ref={toggleRef}
            onClick={() => setDropdownOpen(!isDropdownOpen)}
            isExpanded={isDropdownOpen}
            isDisabled={!apiAvailable || disable}
            splitButtonItems={[
              <MenuToggleAction
                id="import-pipeline-button"
                key="import-pipeline-button"
                data-testid="import-pipeline-button"
                aria-label="Import pipeline"
                onClick={() => setPipelineModalOpen(true)}
              >
                Import pipeline
              </MenuToggleAction>,
            ]}
            aria-label="Import pipeline and pipeline version button"
            data-testid="import-pipeline-split-button"
          />
        )}
        popperProps={{ appendTo: 'inline' }}
      >
        <DropdownList>
          {disableUploadVersion && (
            <Tooltip triggerRef={tooltipRef} content="Create a pipeline to upload a new version." />
          )}
          <DropdownItem
            id="import-pipeline-version-button"
            key="import-pipeline-version-button"
            isAriaDisabled={!apiAvailable || disableUploadVersion}
            onClick={() => setPipelineVersionModalOpen(true)}
            ref={tooltipRef}
          >
            Upload new version
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      {isPipelineModalOpen ? (
        <PipelineImportModal
          onClose={(pipeline) => {
            setPipelineModalOpen(false);
            if (pipeline) {
              if (onImportPipeline) {
                onImportPipeline(pipeline);
              }
              refreshAllAPI();
            }
          }}
        />
      ) : null}
      {isPipelineVersionModalOpen && (
        <PipelineVersionImportModal
          onClose={(pipelineVersion) => {
            setPipelineVersionModalOpen(false);
            if (pipelineVersion) {
              if (onImportPipelineVersion) {
                onImportPipelineVersion(pipelineVersion);
              }
              refreshAllAPI();
            }
          }}
        />
      )}
    </>
  );
};

export default ImportPipelineSplitButton;
