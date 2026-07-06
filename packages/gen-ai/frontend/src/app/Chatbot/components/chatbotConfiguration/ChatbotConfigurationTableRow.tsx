import * as React from 'react';
import { Tr, Td } from '@patternfly/react-table';
import { CheckboxTd, ResourceNameTooltip, TableRowTitleDescription } from 'mod-arch-shared';
import {
  Icon,
  TextInput,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons';
import { AIModel } from '~/app/types';
import { convertAIModelToK8sResource } from '~/app/utilities/utils';

export const MaxTokensPopoverContent = (
  <p>The maximum number of tokens the model can generate per request.</p>
);

export const EmbeddingDimensionPopoverContent = (
  <>
    <p>Configure the embedding dimension for this embedding model.</p>
    <p style={{ marginTop: '8px' }}>
      <strong>Valid range:</strong> 128 to 3,072,000
    </p>
    <p style={{ marginTop: '8px' }}>
      This setting is optional. If not specified, the model will use its default configuration.
    </p>
  </>
);

type ChatbotConfigurationTableRowProps = {
  model: AIModel;
  isChecked: boolean;
  onToggleCheck: () => void;
  isLocked?: boolean;
  modelType: string;
  onModelTypeChange: (value: string) => void;
  maxTokens?: number;
  onMaxTokensChange: (value: number | undefined) => void;
  embeddingDimension?: number;
  onEmbeddingDimensionChange: (value: number | undefined) => void;
};

const ChatbotConfigurationTableRow: React.FC<ChatbotConfigurationTableRowProps> = ({
  model,
  isChecked,
  onToggleCheck,
  isLocked = false,
  modelType,
  onModelTypeChange,
  maxTokens,
  onMaxTokensChange,
  embeddingDimension,
  onEmbeddingDimensionChange,
}) => {
  // Sanitize model name for testid: remove all characters except alphanumeric and hyphens
  const sanitizedModelName = model.model_name.replace(/[^a-zA-Z0-9-]/g, '');

  const [isTypeSelectOpen, setIsTypeSelectOpen] = React.useState(false);

  // Validation state for max_tokens
  const [maxTokensValue, setMaxTokensValue] = React.useState<string>(maxTokens?.toString() || '');
  const [maxTokensValidated, setMaxTokensValidated] = React.useState<
    'default' | 'success' | 'warning' | 'error'
  >('default');
  const [maxTokensHelperText, setMaxTokensHelperText] = React.useState<string>('');

  // Validation state for embedding_dimension (local string for input display)
  const [embeddingDimensionValue, setEmbeddingDimensionValue] = React.useState<string>(
    embeddingDimension?.toString() || '',
  );
  const [embeddingDimensionValidated, setEmbeddingDimensionValidated] = React.useState<
    'default' | 'success' | 'warning' | 'error'
  >('default');
  const [embeddingDimensionHelperText, setEmbeddingDimensionHelperText] =
    React.useState<string>('');

  React.useEffect(() => {
    setEmbeddingDimensionValue(embeddingDimension?.toString() || '');
  }, [embeddingDimension]);

  // Sync with prop changes
  React.useEffect(() => {
    setMaxTokensValue(maxTokens?.toString() || '');
  }, [maxTokens]);

  /**
   * Handles changes to the max_tokens input field with validation.
   * Validates that the input is a valid integer within the range [128, 128000].
   * Updates validation state and calls onMaxTokensChange with the parsed value if valid.
   *
   * @param _event - The form event (unused)
   * @param value - The new input value as a string
   */
  const handleMaxTokensChange = React.useCallback(
    (_event: React.FormEvent<HTMLInputElement>, value: string) => {
      setMaxTokensValue(value);

      // If empty, clear the value
      if (value === '') {
        setMaxTokensValidated('default');
        setMaxTokensHelperText('');
        onMaxTokensChange(undefined);
        return;
      }

      // Require a whole-number string to avoid parseInt quirks
      if (!/^\d+$/.test(value)) {
        setMaxTokensValidated('error');
        setMaxTokensHelperText('Must be a valid number');
        return;
      }

      const numValue = Number(value);

      // Validate range
      if (numValue < 128) {
        setMaxTokensValidated('error');
        setMaxTokensHelperText('Minimum: 128');
        return;
      }

      if (numValue > 128000) {
        setMaxTokensValidated('error');
        setMaxTokensHelperText('Maximum: 128,000');
        return;
      }

      // Valid value
      setMaxTokensValidated('success');
      setMaxTokensHelperText('');
      onMaxTokensChange(numValue);
    },
    [onMaxTokensChange],
  );

  const handleEmbeddingDimensionChange = React.useCallback(
    (_event: React.FormEvent<HTMLInputElement>, value: string) => {
      setEmbeddingDimensionValue(value);

      if (value === '') {
        setEmbeddingDimensionValidated('default');
        setEmbeddingDimensionHelperText('');
        onEmbeddingDimensionChange(undefined);
        return;
      }

      if (!/^\d+$/.test(value)) {
        setEmbeddingDimensionValidated('error');
        setEmbeddingDimensionHelperText('Must be a valid number');
        return;
      }

      const numValue = Number(value);

      if (numValue < 128) {
        setEmbeddingDimensionValidated('error');
        setEmbeddingDimensionHelperText('Minimum: 128');
        return;
      }

      if (numValue > 3072000) {
        setEmbeddingDimensionValidated('error');
        setEmbeddingDimensionHelperText('Maximum: 3,072,000');
        return;
      }

      setEmbeddingDimensionValidated('success');
      setEmbeddingDimensionHelperText('');
      onEmbeddingDimensionChange(numValue);
    },
    [onEmbeddingDimensionChange],
  );

  return (
    <Tr>
      <CheckboxTd
        id={model.model_name}
        isChecked={isChecked}
        isDisabled={
          isLocked || (model.status !== 'Running' && model.model_source_type !== 'custom_endpoint')
        }
        onToggle={onToggleCheck}
        data-testid={`${sanitizedModelName}-checkbox`}
      />
      <Td dataLabel="Model deployment name">
        <TableRowTitleDescription
          title={
            <>
              {model.model_source_type === 'maas' ? (
                model.display_name
              ) : (
                <ResourceNameTooltip resource={convertAIModelToK8sResource(model)}>
                  {model.display_name}
                </ResourceNameTooltip>
              )}
            </>
          }
          description={model.description}
          descriptionAsMarkdown
        />
      </Td>
      <Td dataLabel="Status">
        {model.status === 'Running' ? (
          <Icon status="success" size="md">
            <CheckCircleIcon />
          </Icon>
        ) : model.status === 'Unknown' ? (
          <Icon size="md">
            <OutlinedQuestionCircleIcon />
          </Icon>
        ) : (
          <Icon status="danger" size="md">
            <ExclamationCircleIcon />
          </Icon>
        )}
      </Td>
      <Td dataLabel="Use case">{model.usecase}</Td>
      <Td dataLabel="Type">
        {isChecked ? (
          <Select
            isOpen={isTypeSelectOpen}
            selected={modelType}
            onSelect={(_ev, value) => {
              onModelTypeChange(String(value));
              setIsTypeSelectOpen(false);
            }}
            onOpenChange={(open) => setIsTypeSelectOpen(open)}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsTypeSelectOpen((prev) => !prev)}
                isExpanded={isTypeSelectOpen}
                isDisabled={isLocked}
                data-testid={`${sanitizedModelName}-type-select`}
              >
                {modelType}
              </MenuToggle>
            )}
          >
            <SelectList>
              <SelectOption value="Inference">Inference</SelectOption>
              <SelectOption value="Embedding">Embedding</SelectOption>
            </SelectList>
          </Select>
        ) : (
          <span style={{ color: 'var(--pf-v6-global--Color--200)' }}>—</span>
        )}
      </Td>
      <Td dataLabel="Max tokens">
        {isChecked && modelType === 'Inference' ? (
          <FormGroup fieldId={`max-tokens-${sanitizedModelName}`} style={{ marginBottom: 0 }}>
            <TextInput
              id={`max-tokens-${sanitizedModelName}`}
              type="text"
              value={maxTokensValue}
              onChange={handleMaxTokensChange}
              placeholder=""
              aria-label={`Max tokens for ${model.display_name}`}
              data-testid={`${sanitizedModelName}-max-tokens-input`}
              validated={maxTokensValidated}
              style={{ width: '110px' }}
            />
            {maxTokensValidated === 'error' && maxTokensHelperText && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                    {maxTokensHelperText}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
            {maxTokensValidated === 'success' && maxTokensHelperText && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="success">{maxTokensHelperText}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
        ) : (
          <span style={{ color: 'var(--pf-v6-global--Color--200)' }}>—</span>
        )}
      </Td>
      <Td dataLabel="Embedding dimension">
        {isChecked && modelType === 'Embedding' ? (
          <FormGroup
            fieldId={`embedding-dimension-${sanitizedModelName}`}
            style={{ marginBottom: 0 }}
          >
            <TextInput
              id={`embedding-dimension-${sanitizedModelName}`}
              type="text"
              value={embeddingDimensionValue}
              onChange={handleEmbeddingDimensionChange}
              placeholder=""
              aria-label={`Embedding dimension for ${model.display_name}`}
              data-testid={`${sanitizedModelName}-embedding-dimension-input`}
              validated={embeddingDimensionValidated}
              style={{ width: '110px' }}
            />
            {embeddingDimensionValidated === 'error' && embeddingDimensionHelperText && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                    {embeddingDimensionHelperText}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
        ) : (
          <span style={{ color: 'var(--pf-v6-global--Color--200)' }}>—</span>
        )}
      </Td>
    </Tr>
  );
};

export default ChatbotConfigurationTableRow;
