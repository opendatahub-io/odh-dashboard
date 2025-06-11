import React from 'react';

import {
  Alert,
  Button,
  Content,
  Popover,
  Radio,
  Skeleton,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { PipelineVersionToUse } from '#~/concepts/pipelines/content/createRun/types';
import ImportPipelineVersionButton from '#~/concepts/pipelines/content/import/ImportPipelineVersionButton';
import PipelineVersionImportModal from '#~/concepts/pipelines/content/import/PipelineVersionImportModal';
import PipelineVersionSelector from '#~/concepts/pipelines/content/pipelineSelector/PipelineVersionSelector';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';

type PipelineVersionRadioGroupProps = {
  pipeline: PipelineKF | null;
  selectedVersion: PipelineVersionKF | null;
  latestVersion: PipelineVersionKF | null;
  latestVersionLoaded: boolean;
  versionToUse: PipelineVersionToUse;
  onVersionChange: (args: { value: PipelineVersionKF; versionToUse: PipelineVersionToUse }) => void;
};

const PipelineVersionRadioGroup: React.FC<PipelineVersionRadioGroupProps> = ({
  pipeline,
  selectedVersion,
  latestVersion,
  latestVersionLoaded,
  versionToUse,
  onVersionChange,
}) => {
  const { apiAvailable, refreshAllAPI } = usePipelinesAPI();
  const [isUploadPipelineVersionModalOpen, setIsUploadPipelineVersionModalOpen] =
    React.useState(false);
  const [isVersionPopoverVisible, setIsVersionPopoverVisible] = React.useState(false);

  if (!pipeline) {
    return (
      <Alert
        data-testid="pipeline-not-selected-alert"
        variant="info"
        isInline
        isPlain
        title="You must select a pipeline before you can select a version."
      />
    );
  }

  if (!latestVersionLoaded) {
    return <Skeleton data-testid="skeleton-loader" width="100%" />;
  }

  return (
    <>
      {latestVersion ? (
        <Stack hasGutter>
          <StackItem>
            <Radio
              id="use-latest-version-radio"
              data-testid="use-latest-version-radio"
              name="use-latest-version-radio"
              label="Always use the latest pipeline version"
              isChecked={versionToUse === PipelineVersionToUse.LATEST}
              onChange={() => {
                onVersionChange({
                  value: latestVersion,
                  versionToUse: PipelineVersionToUse.LATEST,
                });
              }}
              description="The system will automatically use the most recent pipeline version for each recurring run."
              body={
                <>
                  <Popover
                    aria-label="Hoverable popover"
                    data-testid="view-latest-version-popover"
                    isVisible={isVersionPopoverVisible}
                    shouldOpen={() => setIsVersionPopoverVisible(true)}
                    shouldClose={() => setIsVersionPopoverVisible(false)}
                    bodyContent={
                      <>
                        <Content>
                          Currently, <strong>{latestVersion.display_name}</strong> is the latest
                          pipeline version.
                        </Content>
                        <Button
                          variant="link"
                          isDisabled={!apiAvailable}
                          onClick={() => {
                            setIsVersionPopoverVisible(false);
                            setIsUploadPipelineVersionModalOpen(true);
                          }}
                        >
                          Upload new version
                        </Button>
                      </>
                    }
                  >
                    <Button
                      style={{ paddingLeft: 0 }}
                      icon={<OutlinedQuestionCircleIcon />}
                      iconPosition="right"
                      data-testid="view-latest-version-button"
                      variant="link"
                    >
                      View the current latest version name
                    </Button>
                  </Popover>
                  {isUploadPipelineVersionModalOpen && (
                    <PipelineVersionImportModal
                      redirectAfterImport={false}
                      existingPipeline={pipeline}
                      onClose={(value) => {
                        setIsUploadPipelineVersionModalOpen(false);
                        if (value) {
                          onVersionChange({
                            value,
                            versionToUse: PipelineVersionToUse.PROVIDED,
                          });
                          refreshAllAPI();
                        }
                      }}
                    />
                  )}
                </>
              }
            />
          </StackItem>
          <StackItem>
            <Radio
              id="use-fixed-version-radio"
              name="use-fixed-version-radio"
              data-testid="use-fixed-version-radio"
              label="Use fixed version"
              isChecked={versionToUse === PipelineVersionToUse.PROVIDED}
              onChange={() => {
                onVersionChange({
                  value: selectedVersion ?? latestVersion,
                  versionToUse: PipelineVersionToUse.PROVIDED,
                });
              }}
              description="The system will use the selected pipeline version for all recurring runs."
              body={
                versionToUse === PipelineVersionToUse.PROVIDED && (
                  <Stack>
                    <StackItem>
                      <PipelineVersionSelector
                        selection={(selectedVersion ?? latestVersion).display_name}
                        pipelineId={pipeline.pipeline_id}
                        onSelect={(value) => {
                          onVersionChange({
                            value,
                            versionToUse: PipelineVersionToUse.PROVIDED,
                          });
                        }}
                        isCreatePage
                      />
                    </StackItem>
                    <StackItem>
                      <ImportPipelineVersionButton
                        data-testid="import-pipeline-version-radio-button"
                        selectedPipeline={pipeline}
                        variant="link"
                        icon={<PlusCircleIcon />}
                        onCreate={(value) => {
                          onVersionChange({
                            value,
                            versionToUse: PipelineVersionToUse.PROVIDED,
                          });
                        }}
                        redirectAfterImport={false}
                      />
                    </StackItem>
                  </Stack>
                )
              }
            />
          </StackItem>
        </Stack>
      ) : (
        <Stack hasGutter>
          <StackItem>
            <Alert
              data-testid="no-pipeline-versions-available-alert"
              variant="warning"
              isInline
              isPlain
              title="No pipeline versions available"
            >
              Upload a pipeline version to the selected pipeline.
            </Alert>
          </StackItem>
          <StackItem>
            <ImportPipelineVersionButton
              selectedPipeline={pipeline}
              variant="link"
              icon={<PlusCircleIcon />}
              onCreate={(value) => {
                onVersionChange({ value, versionToUse: PipelineVersionToUse.PROVIDED });
              }}
              redirectAfterImport={false}
            />
          </StackItem>
        </Stack>
      )}
    </>
  );
};

export default PipelineVersionRadioGroup;
