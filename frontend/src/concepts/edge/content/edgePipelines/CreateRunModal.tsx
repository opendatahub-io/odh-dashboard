import React, { useState } from 'react';
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
import { EdgeModel } from '~/concepts/edge/types';
import { CreateRunCompletionType } from './types';

type CreateRunModelProps = {
  isOpen: boolean;
  pipelineName?: string;
  models?: EdgeModel[];
  onClose: () => void;
  onCreate: () => void;
};

const CreateRunModel: React.FC<CreateRunModelProps> = ({
  isOpen,
  pipelineName,
  models = [],
  onClose,
  onCreate,
}) => {
  const [model, setModel] = useState<EdgeModel>();
  const [completionType, setCompletionType] = useState<CreateRunCompletionType>(
    CreateRunCompletionType.OVERWRITE,
  );
  const [modelSelectIsOpen, setModelSelectIsOpen] = useState(false);
  const isButtonDisabled = !model;

  const onBeforeClose = () => {
    setModel(undefined);
    setCompletionType(CreateRunCompletionType.OVERWRITE);
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
          onSubmit={() => {
            onCreate(); // TODO update this with the correct function input
            onBeforeClose();
          }}
          onCancel={() => onBeforeClose()}
          isSubmitDisabled={isButtonDisabled}
          alertTitle="Error creating pipeline run"
        />
      }
    >
      <Form>
        <FormGroup label="Pipeline name" fieldId="pipeline-name">
          <Text>{pipelineName}</Text>
        </FormGroup>
        <FormGroup label="Model name" fieldId="model-name">
          <Select
            id="single-select"
            isOpen={modelSelectIsOpen}
            selected={model}
            onSelect={(_e, selection) => {
              const modelLookup = models.find((m) => m.params.modelName === selection);
              if (modelLookup) {
                setModel(modelLookup);
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
                {model ? model.params.modelName : 'Select'}
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
        {model && (
          <>
            <FormGroup label="Output container image URL" fieldId="output-container-image-url">
              <i>{`quay.io/${model.params.targetImageRepo}/${model.params.modelName}`}</i>
            </FormGroup>
            <FormGroup label="On pipeline completion" fieldId="pipeline-completion">
              <Stack>
                <StackItem>
                  <Radio
                    isChecked={completionType === CreateRunCompletionType.OVERWRITE}
                    name="overwrite"
                    onChange={() => setCompletionType(CreateRunCompletionType.OVERWRITE)}
                    label={`Overwrite image file: ${model.params.modelName}:${model.params.modelVersion}`}
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
