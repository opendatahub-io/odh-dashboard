import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  FormGroup,
  Text,
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  Radio,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { CreateRunCompletionType, EdgeModel } from '~/concepts/edge/types';
import { reRunModel } from '~/concepts/edge/utils';

type CreateRunModelProps = {
  isOpen: boolean;
  pipelineName?: string;
  models?: EdgeModel[];
  model?: EdgeModel;
  onClose: () => void;
  onCreate: () => void;
};

const CreateRunModel: React.FC<CreateRunModelProps> = ({
  isOpen,
  pipelineName,
  models = [],
  model,
  onClose,
  onCreate,
}) => {
  const [selectedModel, setSelectedModel] = useState<EdgeModel>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (model) {
      setSelectedModel(model);
    }
  }, [model]);

  const [completionType, setCompletionType] = useState<CreateRunCompletionType>(
    CreateRunCompletionType.OVERWRITE,
  );
  const [modelSelectIsOpen, setModelSelectIsOpen] = useState(false);
  const isButtonDisabled = !selectedModel;

  const onBeforeClose = () => {
    setSelectedModel(undefined);
    setCompletionType(CreateRunCompletionType.OVERWRITE);
    setError(undefined);
    setIsLoading(false);
    onClose();
  };

  const filteredModels = React.useMemo(
    () => models.filter((m) => m.latestRun.run.spec.pipelineRef?.name === pipelineName),
    [models, pipelineName],
  );

  return (
    <Modal
      title="Create pipeline run"
      variant="small"
      isOpen={isOpen}
      onClose={() => {
        onBeforeClose();
      }}
      footer={
        <DashboardModalFooter
          submitLabel="Create run"
          isLoading={isLoading}
          onSubmit={() => {
            if (selectedModel) {
              setIsLoading(true);
              reRunModel(selectedModel, completionType)
                .then(() => {
                  onCreate();
                  onBeforeClose();
                })
                .catch((e) => setError(e))
                .finally(() => {
                  setIsLoading(false);
                });
            }
          }}
          onCancel={() => onBeforeClose()}
          isSubmitDisabled={isButtonDisabled}
          error={error}
          alertTitle="Error creating pipeline run"
        />
      }
    >
      <Form>
        <FormGroup label="Pipeline name" fieldId="pipeline-name">
          <Text>{pipelineName}</Text>
        </FormGroup>
        {model ? (
          <FormGroup label="Model name" fieldId="model-name-preset">
            <Text>{model.params.modelName}</Text>
          </FormGroup>
        ) : (
          <FormGroup label="Model name" fieldId="model-name-select">
            <Select
              id="single-select"
              isOpen={modelSelectIsOpen}
              selected={selectedModel}
              onSelect={(_e, selection) => {
                const modelLookup = models.find((m) => m.params.modelName === selection);
                if (modelLookup) {
                  setError(undefined);
                  setSelectedModel(modelLookup);
                  setModelSelectIsOpen(false);
                }
              }}
              onOpenChange={(o) => setModelSelectIsOpen(!o)}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setModelSelectIsOpen(!modelSelectIsOpen)}
                  isExpanded={modelSelectIsOpen}
                  style={
                    {
                      width: '200px',
                    } as React.CSSProperties
                  }
                >
                  {selectedModel ? selectedModel.params.modelName : 'Select'}
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {filteredModels.map((m) => (
                  <SelectOption key={m.params.modelName} value={m.params.modelName}>
                    {m.params.modelName}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>
        )}

        {selectedModel && (
          <>
            <FormGroup label="Output container image URL" fieldId="output-container-image-url">
              <i>{`quay.io/${selectedModel.params.targetImageRepo}/${selectedModel.params.modelName}`}</i>
            </FormGroup>
            <FormGroup label="On pipeline completion" fieldId="pipeline-completion">
              <Stack>
                <StackItem>
                  <Radio
                    isChecked={completionType === CreateRunCompletionType.OVERWRITE}
                    name="overwrite"
                    onChange={() => setCompletionType(CreateRunCompletionType.OVERWRITE)}
                    label={`Overwrite image file: ${selectedModel.params.modelName}:${selectedModel.params.modelVersion}`}
                    id="radio-overwrite"
                  />
                </StackItem>
                <StackItem>
                  <Radio
                    isChecked={completionType === CreateRunCompletionType.INCREMENT}
                    name="increment"
                    onChange={() => setCompletionType(CreateRunCompletionType.INCREMENT)}
                    label="Increment image file version"
                    id="radio-increment"
                  />
                </StackItem>
              </Stack>
            </FormGroup>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default CreateRunModel;
