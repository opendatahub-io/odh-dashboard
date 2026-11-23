/* eslint-disable camelcase */
import * as React from 'react';
import {
  Button,
  Content,
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
  Slider,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import GeneratorModelFields from '~/app/components/collectionBuilder/GeneratorModelFields';
import {
  generatorModelSelectionSchema,
  recommendationSettingsSchema,
  type CollectionBuilderFormValues,
  type GeneratorModelSelection,
} from '~/app/schemas/collectionBuilder.schema';
import type { InferenceServiceItem } from '~/app/types';
import { getGeneratorModelEndpoint } from '~/app/utils/generatorModelUtils';

import './RecommendationSettingsModal.scss';

const EXTERNAL_ENDPOINT_VALUE = '__external__';

type ModelOption = {
  value: string;
  name: string;
  selection?: GeneratorModelSelection;
  disabledReason?: string;
};

const MATCH_STEPS = [
  { value: 0, label: 'Include related areas' },
  { value: 50, label: 'Balanced' },
  { value: 100, label: 'Direct matches' },
];

const DEPTH_STEPS = [
  { value: 0, label: 'Quick review' },
  { value: 50, label: 'Balanced' },
  { value: 100, label: 'Thorough review' },
];

type RecommendationSettingsModalProps = {
  isOpen: boolean;
  selectedModel: GeneratorModelSelection | null;
  selectedStrictness: CollectionBuilderFormValues['strictness'];
  selectedGenerationEffort: CollectionBuilderFormValues['generationEffort'];
  inferenceServices: InferenceServiceItem[];
  inferenceServicesLoaded: boolean;
  inferenceServicesError: Error | undefined;
  onClose: () => void;
  onSave: (settings: {
    model: GeneratorModelSelection;
    strictness: CollectionBuilderFormValues['strictness'];
    generationEffort: CollectionBuilderFormValues['generationEffort'];
  }) => void;
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

const RecommendationSettingsModal: React.FC<RecommendationSettingsModalProps> = ({
  isOpen,
  selectedModel,
  selectedStrictness,
  selectedGenerationEffort,
  inferenceServices,
  inferenceServicesLoaded,
  inferenceServicesError,
  onClose,
  onSave,
}) => {
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [draftModel, setDraftModel] = React.useState<GeneratorModelSelection | null>(selectedModel);
  const [draftStrictness, setDraftStrictness] = React.useState(selectedStrictness);
  const [draftGenerationEffort, setDraftGenerationEffort] =
    React.useState(selectedGenerationEffort);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const wasOpen = React.useRef(false);
  const modelOptions = React.useMemo(() => getModelOptions(inferenceServices), [inferenceServices]);
  React.useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setDraftModel(selectedModel);
      setDraftStrictness(selectedStrictness);
      setDraftGenerationEffort(selectedGenerationEffort);
      setTouched({});
      setIsSelectOpen(false);
    }
    wasOpen.current = isOpen;
  }, [isOpen, selectedModel, selectedStrictness, selectedGenerationEffort]);
  const selectedValue =
    draftModel?.source === 'external' ? EXTERNAL_ENDPOINT_VALUE : draftModel?.name;
  const endpointUrl = draftModel?.source === 'external' ? draftModel.url : '';
  const modelName = draftModel?.source === 'external' ? draftModel.name : '';
  const secretRef = draftModel?.source === 'external' ? (draftModel.auth?.secret_ref ?? '') : '';
  const parsedModel = draftModel ? generatorModelSelectionSchema.safeParse(draftModel) : undefined;
  const parsedSettings = recommendationSettingsSchema.safeParse({
    strictness: draftStrictness,
    generationEffort: draftGenerationEffort,
  });
  const isDraftClusterModelSelectable =
    draftModel?.source !== 'cluster' ||
    (inferenceServicesLoaded &&
      !inferenceServicesError &&
      modelOptions.some(
        (option) =>
          option.selection?.name === draftModel.name && option.selection.url === draftModel.url,
      ));
  const canSaveSettings =
    parsedModel?.success && parsedSettings.success && isDraftClusterModelSelectable;

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
    if (parsedModel?.success && parsedSettings.success) {
      const { auth, ...model } = parsedModel.data;
      onSave({
        model: auth?.secret_ref ? parsedModel.data : model,
        ...parsedSettings.data,
      });
    }
  };

  const isExternal = draftModel?.source === 'external';

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="medium">
      <ModalHeader title="Recommendation settings" />
      <ModalBody>
        <Content component="p" className="pf-v6-u-mb-lg">
          This model suggests benchmarks for your goal. It is not the model being evaluated.
        </Content>
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
                  Required model used to suggest benchmarks, not the model being evaluated.
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

          <FormGroup label="Match to evaluation goal" fieldId="recommendation-settings-match">
            <Slider
              id="recommendation-settings-match"
              min={0}
              max={100}
              step={1}
              value={draftStrictness === 'lenient' ? 0 : draftStrictness === 'strict' ? 100 : 50}
              customSteps={MATCH_STEPS}
              onChange={(_event, value) =>
                setDraftStrictness(value === 0 ? 'lenient' : value === 100 ? 'strict' : 'moderate')
              }
              className="evalhub-recommendation-settings-modal__slider"
              thumbAriaLabel="Match to evaluation goal"
              data-testid="recommendation-settings-match"
            />
          </FormGroup>

          <FormGroup label="Recommendation depth" fieldId="recommendation-settings-depth">
            <Slider
              id="recommendation-settings-depth"
              min={0}
              max={100}
              step={1}
              value={
                draftGenerationEffort === 'low' ? 0 : draftGenerationEffort === 'high' ? 100 : 50
              }
              customSteps={DEPTH_STEPS}
              onChange={(_event, value) =>
                setDraftGenerationEffort(value === 0 ? 'low' : value === 100 ? 'high' : 'standard')
              }
              className="evalhub-recommendation-settings-modal__slider"
              thumbAriaLabel="Recommendation depth"
              data-testid="recommendation-settings-depth"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          variant="primary"
          isDisabled={!canSaveSettings}
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

export default RecommendationSettingsModal;
/* eslint-enable camelcase */
