import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleAction,
} from '@patternfly/react-core';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineImportModal from '~/concepts/pipelines/content/import/PipelineImportModal';
import PipelineVersionImportModal from '~/concepts/pipelines/content/import/PipelineVersionImportModal';

type ImportPipelineSplitButtonProps = {
  onImportPipeline?: (pipeline: PipelineKF) => void;
  onImportPipelineVersion?: (pipelineVersion: PipelineVersionKF) => void;
};

const ImportPipelineSplitButton: React.FC<ImportPipelineSplitButtonProps> = ({
  onImportPipeline,
  onImportPipelineVersion,
}) => {
  const { apiAvailable, refreshAllAPI } = usePipelinesAPI();
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);
  const [isPipelineModalOpen, setPipelineModalOpen] = React.useState(false);
  const [isPipelineVersionModalOpen, setPipelineVersionModalOpen] = React.useState(false);

  return (
    <>
      <Dropdown
        isOpen={isDropdownOpen}
        onSelect={() => setDropdownOpen(false)}
        onOpenChange={(isOpen) => setDropdownOpen(isOpen)}
        toggle={(toggleRef) => (
          <MenuToggle
            isFullWidth
            variant="primary"
            ref={toggleRef}
            onClick={() => setDropdownOpen(!isDropdownOpen)}
            isExpanded={isDropdownOpen}
            splitButtonOptions={{
              variant: 'action',
              items: [
                <MenuToggleAction
                  id="import-pipeline-button"
                  key="import-pipeline-button"
                  aria-label="Import pipeline"
                  onClick={() => setPipelineModalOpen(true)}
                  isDisabled={!apiAvailable}
                >
                  Import pipeline
                </MenuToggleAction>,
              ],
            }}
            aria-label="Import pipeline and pipeline version button"
          />
        )}
      >
        <DropdownList>
          <DropdownItem
            id="import-pipeline-version-button"
            key="import-pipeline-version-button"
            onClick={() => setPipelineVersionModalOpen(true)}
          >
            Upload new version
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      <PipelineImportModal
        isOpen={isPipelineModalOpen}
        onClose={(pipeline) => {
          setPipelineModalOpen(false);
          if (pipeline) {
            onImportPipeline && onImportPipeline(pipeline);
            refreshAllAPI();
          }
        }}
      />
      {isPipelineVersionModalOpen && (
        <PipelineVersionImportModal
          onClose={(pipelineVersion) => {
            setPipelineVersionModalOpen(false);
            if (pipelineVersion) {
              onImportPipelineVersion && onImportPipelineVersion(pipelineVersion);
              refreshAllAPI();
            }
          }}
        />
      )}
    </>
  );
};

export default ImportPipelineSplitButton;
