import * as React from 'react';
import {
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import type { RecommendationModelProfile } from '~/app/types';

type RecommendationModelModalProps = {
  isOpen: boolean;
  selectedModelId: string;
  recommendationModels: RecommendationModelProfile[];
  onClose: () => void;
  onSave: (modelId: string) => void;
};

const RecommendationModelModal: React.FC<RecommendationModelModalProps> = ({
  isOpen,
  selectedModelId,
  recommendationModels,
  onClose,
  onSave,
}) => {
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [draftModelId, setDraftModelId] = React.useState(selectedModelId);
  const draftModel = recommendationModels.find((model) => model.id === draftModelId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="small">
      <ModalHeader title="Change recommendation model" />
      <ModalBody>
        <Form>
          <FormGroup label="Model" fieldId="recommendation-model-toggle" isRequired>
            <Select
              id="recommendation-model-select"
              isOpen={isSelectOpen}
              selected={draftModelId}
              onSelect={(_event, value) => {
                if (typeof value === 'string') {
                  setDraftModelId(value);
                }
                setIsSelectOpen(false);
              }}
              onOpenChange={setIsSelectOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  id="recommendation-model-toggle"
                  onClick={() => setIsSelectOpen((open) => !open)}
                  isExpanded={isSelectOpen}
                  isFullWidth
                  data-testid="recommendation-model-toggle"
                >
                  {draftModel?.displayName ?? 'Select a model'}
                </MenuToggle>
              )}
            >
              <SelectList>
                {recommendationModels.map((model) => (
                  <SelectOption
                    key={model.id}
                    value={model.id}
                    isSelected={model.id === draftModelId}
                    data-testid={`recommendation-model-option-${model.id}`}
                  >
                    {model.displayName}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
            <FormHelperText className="pf-v6-u-mt-sm">
              <HelperText>
                <HelperTextItem>
                  Choose the model that suggests benchmarks for your goal.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          variant="primary"
          isDisabled={!draftModel}
          onClick={() => onSave(draftModelId)}
          data-testid="save-recommendation-model"
        >
          Save
        </Button>
        <Button
          type="button"
          variant="link"
          onClick={onClose}
          data-testid="cancel-recommendation-model"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RecommendationModelModal;
