import * as React from 'react';
import { Tr, Td } from '@patternfly/react-table';
import { CheckboxTd, ResourceNameTooltip, TableRowTitleDescription } from 'mod-arch-shared';
import {
  Icon,
  Label,
  Popover,
  Flex,
  FlexItem,
  TextInput,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Button,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons';
import { AIModel } from '~/app/types';
import { convertAIModelToK8sResource } from '~/app/utilities/utils';

type ChatbotConfigurationTableRowProps = {
  model: AIModel;
  isChecked: boolean;
  onToggleCheck: () => void;
  maxTokens?: number;
  onMaxTokensChange: (value: number | undefined) => void;
};

const ChatbotConfigurationTableRow: React.FC<ChatbotConfigurationTableRowProps> = ({
  model,
  isChecked,
  onToggleCheck,
  maxTokens,
  onMaxTokensChange,
}) => {
  // Sanitize model name for testid: remove all characters except alphanumeric and hyphens
  const sanitizedModelName = model.model_name.replace(/[^a-zA-Z0-9-]/g, '');

  // Validation state for max_tokens
  const [maxTokensValue, setMaxTokensValue] = React.useState<string>(maxTokens?.toString() || '');
  const [maxTokensValidated, setMaxTokensValidated] = React.useState<
    'default' | 'success' | 'warning' | 'error'
  >('default');
  const [maxTokensHelperText, setMaxTokensHelperText] = React.useState<string>('');

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

  return (
    <Tr>
      <CheckboxTd
        id={model.model_name}
        isChecked={isChecked}
        isDisabled={model.status !== 'Running'}
        onToggle={onToggleCheck}
        data-testid={`${sanitizedModelName}-checkbox`}
      />
      <Td dataLabel="Model deployment name">
        <TableRowTitleDescription
          title={
            <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
                {model.isMaaSModel ? (
                  model.display_name
                ) : (
                  <ResourceNameTooltip resource={convertAIModelToK8sResource(model)}>
                    {model.display_name}
                  </ResourceNameTooltip>
                )}
              </FlexItem>
              {model.isMaaSModel && (
                <FlexItem>
                  <Popover aria-label="Models as a Service" bodyContent={<>Models as a Service</>}>
                    <Label color="orange" aria-label="Model as a Service">
                      MaaS
                    </Label>
                  </Popover>
                </FlexItem>
              )}
            </Flex>
          }
          description={model.description}
          descriptionAsMarkdown
        />
      </Td>
      <Td dataLabel="Status">
        <Icon status={model.status === 'Running' ? 'success' : 'danger'} size="md">
          {model.status === 'Running' ? <CheckCircleIcon /> : <ExclamationCircleIcon />}
        </Icon>
      </Td>
      <Td dataLabel="Use case">{model.usecase}</Td>
      <Td dataLabel="Max tokens">
        {isChecked ? (
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
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
            </FlexItem>
            <FlexItem>
              <Popover
                aria-label="Max tokens help"
                headerContent="Max tokens"
                bodyContent={
                  <>
                    <p>Configure the maximum number of tokens (context window) for this model.</p>
                    <p style={{ marginTop: '8px' }}>
                      <strong>Valid range:</strong> 128 to 128,000 tokens
                    </p>
                    <p style={{ marginTop: '8px' }}>
                      This setting is optional. If not specified, the model will use its default
                      configuration.
                    </p>
                  </>
                }
              >
                <Button
                  variant="plain"
                  aria-label="Max tokens help"
                  data-testid={`${sanitizedModelName}-max-tokens-info`}
                >
                  <OutlinedQuestionCircleIcon />
                </Button>
              </Popover>
            </FlexItem>
          </Flex>
        ) : (
          <span style={{ color: 'var(--pf-v6-global--Color--200)' }}>—</span>
        )}
      </Td>
    </Tr>
  );
};

export default ChatbotConfigurationTableRow;
