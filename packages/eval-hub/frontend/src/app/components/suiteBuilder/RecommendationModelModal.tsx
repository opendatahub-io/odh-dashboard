/* eslint-disable camelcase */
import * as React from 'react';
import {
  Button,
  Divider,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import GeneratorModelFields from '~/app/components/suiteBuilder/GeneratorModelFields';
import {
  generatorModelSelectionSchema,
  type GeneratorModelSelection,
} from '~/app/schemas/suiteBuilder.schema';
import type { InferenceServiceItem } from '~/app/types';
import { getGeneratorModelEndpoint } from '~/app/utils/generatorModelUtils';

const EXTERNAL_ENDPOINT_VALUE = '__external__';

type ModelOption = {
  value: string;
  name: string;
  selection?: GeneratorModelSelection;
  disabledReason?: string;
};

type RecommendationModelModalProps = {
  isOpen: boolean;
  selectedModel: GeneratorModelSelection | null;
  inferenceServices: InferenceServiceItem[];
  inferenceServicesLoaded: boolean;
  inferenceServicesError: Error | undefined;
  onClose: () => void;
  onSave: (model: GeneratorModelSelection) => void;
};

const getModelOptions = (inferenceServices: InferenceServiceItem[]): ModelOption[] =>
  inferenceServices.map((service) => {
    const url = getGeneratorModelEndpoint(service);
    if (!url) {
      return {
        value: service.name,
        name: service.name,
        disabledReason: !service.ready
          ? 'This model is unavailable. Check the model’s deployment status.'
          : service.url?.trim()
            ? 'This model has an invalid endpoint URL.'
            : 'This model does not have an endpoint URL.',
      };
    }
    return {
      value: service.name,
      name: service.name,
      selection: { source: 'cluster', name: service.name, url },
    };
  });

const RecommendationModelModal: React.FC<RecommendationModelModalProps> = ({
  isOpen,
  selectedModel,
  inferenceServices,
  inferenceServicesLoaded,
  inferenceServicesError,
  onClose,
  onSave,
}) => {
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [draftModel, setDraftModel] = React.useState<GeneratorModelSelection | null>(selectedModel);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const wasOpen = React.useRef(false);
  const modelOptions = React.useMemo(() => getModelOptions(inferenceServices), [inferenceServices]);
  React.useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setDraftModel(selectedModel);
      setTouched({});
      setIsSelectOpen(false);
    }
    wasOpen.current = isOpen;
  }, [isOpen, selectedModel]);
  const selectedValue =
    draftModel?.source === 'external' ? EXTERNAL_ENDPOINT_VALUE : draftModel?.name;
  const endpointUrl = draftModel?.source === 'external' ? draftModel.url : '';
  const modelName = draftModel?.source === 'external' ? draftModel.name : '';
  const secretRef = draftModel?.source === 'external' ? (draftModel.auth?.secret_ref ?? '') : '';
  const parsedModel = draftModel ? generatorModelSelectionSchema.safeParse(draftModel) : undefined;
  const isDraftClusterModelSelectable =
    draftModel?.source !== 'cluster' ||
    (inferenceServicesLoaded &&
      !inferenceServicesError &&
      modelOptions.some(
        (option) =>
          option.selection?.name === draftModel.name && option.selection.url === draftModel.url,
      ));
  const canSaveModel = parsedModel?.success && isDraftClusterModelSelectable;

  const markTouched = (field: string) => {
    setTouched((previous) => (previous[field] ? previous : { ...previous, [field]: true }));
  };

  const handleSelect = (
    _event: React.MouseEvent | undefined,
    value: string | number | undefined,
  ) => {
    if (value === EXTERNAL_ENDPOINT_VALUE) {
      setDraftModel({ source: 'external', name: '', url: '', auth: { secret_ref: '' } });
    } else if (typeof value === 'string') {
      const option = modelOptions.find((candidate) => candidate.value === value);
      if (option?.selection) {
        setDraftModel(option.selection);
      }
    }
    setTouched({});
    setIsSelectOpen(false);
  };

  const handleSave = () => {
    if (parsedModel?.success) {
      const { auth, ...model } = parsedModel.data;
      onSave(auth?.secret_ref ? parsedModel.data : model);
    }
  };

  const isExternal = draftModel?.source === 'external';

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="medium">
      <ModalHeader title="Choose a recommendation model" />
      <ModalBody>
        <Form>
          <FormGroup label="Model" fieldId="recommendation-model-toggle" isRequired>
            <Select
              id="recommendation-model-select"
              isOpen={isSelectOpen}
              selected={selectedValue}
              onSelect={handleSelect}
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
                  {draftModel?.source === 'external'
                    ? 'Other (External endpoint)'
                    : draftModel?.name || 'Select a model'}
                </MenuToggle>
              )}
            >
              <SelectList>
                {inferenceServicesLoaded
                  ? modelOptions.map((option) => (
                      <SelectOption
                        key={option.value}
                        value={option.value}
                        isDisabled={!!option.disabledReason}
                        isSelected={
                          draftModel?.source === 'cluster' && draftModel.name === option.name
                        }
                        description={option.disabledReason}
                        data-testid={`recommendation-model-option-${option.value}`}
                      >
                        {option.name}
                        {option.disabledReason ? (
                          <Icon status="danger" iconSize="sm" className="pf-v6-u-ml-sm">
                            <ExclamationCircleIcon />
                          </Icon>
                        ) : null}
                      </SelectOption>
                    ))
                  : null}
                {inferenceServicesLoaded && modelOptions.length > 0 ? <Divider /> : null}
                <SelectOption
                  value={EXTERNAL_ENDPOINT_VALUE}
                  isSelected={draftModel?.source === 'external'}
                  data-testid="recommendation-model-option-external"
                >
                  Other (External endpoint)
                </SelectOption>
              </SelectList>
            </Select>
            {inferenceServicesError ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="warning">
                    Could not load project models. You can still use an external endpoint.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : null}
            <FormHelperText className="pf-v6-u-mt-sm">
              <HelperText>
                <HelperTextItem>
                  Choose the model that suggests benchmarks for your goal.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {isExternal ? (
            <GeneratorModelFields
              modelName={modelName}
              onModelNameChange={(name) =>
                setDraftModel((previous) =>
                  previous?.source === 'external' ? { ...previous, name } : previous,
                )
              }
              endpointUrl={endpointUrl}
              onEndpointUrlChange={(url) =>
                setDraftModel((previous) =>
                  previous?.source === 'external' ? { ...previous, url } : previous,
                )
              }
              apiKeySecretRef={secretRef}
              onApiKeyChange={(value) =>
                setDraftModel((previous) =>
                  previous?.source === 'external'
                    ? { ...previous, auth: { secret_ref: value } }
                    : previous,
                )
              }
              touched={touched}
              markTouched={markTouched}
            />
          ) : null}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          variant="primary"
          isDisabled={!canSaveModel}
          onClick={handleSave}
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
/* eslint-enable camelcase */
