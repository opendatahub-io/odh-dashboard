import {
  ActionGroup,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import {
  MultiSelection,
  SelectionOptions,
} from '@odh-dashboard/internal/components/MultiSelection';
import { useNavigate } from 'react-router-dom';
import { mockAvailableGroups, RateLimit, Tier } from '~/app/types/tier';
import { RateLimitCheckbox } from './RateLimitCheckbox';
import { useCreateTierFormValidation } from './useCreateTierFormValidation';

const DEFAULT_TOKEN_LIMIT: RateLimit = { count: 10000, time: 1, unit: 'hour' };
const DEFAULT_REQUEST_LIMIT: RateLimit = { count: 100, time: 1, unit: 'minute' };

type CreateTierFormProps = {
  tier?: Tier;
};

const CreateTierForm: React.FC<CreateTierFormProps> = ({ tier }) => {
  const navigate = useNavigate();
  const { data, onDataChange } = useK8sNameDescriptionFieldData({
    initialData: tier
      ? {
          name: tier.displayName,
          k8sName: tier.name,
          description: tier.description,
        }
      : undefined,
  });

  const [selectedGroups, setSelectedGroups] = React.useState<SelectionOptions[]>(() =>
    mockAvailableGroups.map((group) => ({
      id: group,
      name: group,
      selected: tier?.groups.includes(group) ?? false,
    })),
  );
  const [groupsTouched, setGroupsTouched] = React.useState(false);

  const [tokenLimitEnabled, setTokenLimitEnabled] = React.useState(false);
  const [tokenLimits, setTokenLimits] = React.useState<RateLimit[]>(
    tier?.limits.tokensPerUnit ?? [DEFAULT_TOKEN_LIMIT],
  );

  const [requestLimitEnabled, setRequestLimitEnabled] = React.useState(false);
  const [requestLimits, setRequestLimits] = React.useState<RateLimit[]>(
    tier?.limits.requestsPerUnit ?? [DEFAULT_REQUEST_LIMIT],
  );

  const [level, setLevel] = React.useState(tier?.level ?? 1);

  // Get selected group names for validation
  const selectedGroupNames = selectedGroups.filter((g) => g.selected).map((g) => g.name);

  const isK8sNameValid = isK8sNameDescriptionDataValid(data);

  const { isValid: isFormValid, getAllValidationIssues } = useCreateTierFormValidation({
    name: data.name,
    level,
    groups: selectedGroupNames,
    tokenLimitEnabled,
    tokenLimits,
    requestLimitEnabled,
    requestLimits,
  });

  const canSubmit = isK8sNameValid && isFormValid;

  return (
    <Form maxWidth="750px">
      <K8sNameDescriptionField
        data={data}
        onDataChange={onDataChange}
        dataTestId="tier-name-desc"
        nameHelperText='A descriptive name for this tier (e.g., "Premium Tier")'
        descriptionHelperText="Optional description of this tier's purpose and target users"
      />
      <FormGroup label="Level" fieldId="tier-level" isRequired>
        <NumberInput
          value={Number.isNaN(level) ? '' : level}
          min={1}
          max={999999}
          data-testid="tier-level"
          validated={
            getAllValidationIssues(['level']).length > 0
              ? ValidatedOptions.error
              : ValidatedOptions.default
          }
          onChange={(event: React.FormEvent<HTMLInputElement>) => {
            const inputValue = event.currentTarget.value;
            if (inputValue === '') {
              // Allow empty field - store as NaN to indicate empty
              setLevel(NaN);
            } else {
              const newValue = parseInt(inputValue, 10);
              if (!Number.isNaN(newValue)) {
                setLevel(newValue);
              }
            }
          }}
          onMinus={() => setLevel(Math.max(1, (level || 1) - 1))}
          onPlus={() => setLevel((level || 0) + 1)}
        />
        {getAllValidationIssues(['level']).length > 0 && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
                {getAllValidationIssues(['level'])[0].message}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Higher numbers indicate higher priority. Users with access to multiple tiers will
              automatically use the highest level tier available to them
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup label="Groups" fieldId="tier-groups" isRequired>
        <MultiSelection
          ariaLabel="This tier will apply to all users in these groups"
          value={selectedGroups}
          setValue={(newValue) => {
            setGroupsTouched(true);
            setSelectedGroups(newValue);
          }}
          toggleTestId="tier-groups"
          isCreatable
          createOptionMessage={(value) => `Create group "${value}"`}
          placeholder="Select or create groups..."
          selectionRequired={groupsTouched}
          noSelectedOptionsMessage="One or more groups must be selected"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>This tier will apply to all users in these groups</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup fieldId="tier-rate-limits">
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
          <FlexItem>
            <RateLimitCheckbox
              id="tier-token-rate-limit"
              type="token"
              rateLimits={tokenLimits}
              onChange={setTokenLimits}
              isChecked={tokenLimitEnabled}
              onToggle={setTokenLimitEnabled}
              defaultRateLimit={DEFAULT_TOKEN_LIMIT}
              validationIssues={getAllValidationIssues()}
            />
          </FlexItem>
          <FlexItem>
            <RateLimitCheckbox
              id="tier-request-rate-limit"
              type="request"
              rateLimits={requestLimits}
              onChange={setRequestLimits}
              isChecked={requestLimitEnabled}
              onToggle={setRequestLimitEnabled}
              defaultRateLimit={DEFAULT_REQUEST_LIMIT}
              validationIssues={getAllValidationIssues()}
            />
          </FlexItem>
        </Flex>
      </FormGroup>
      <ActionGroup>
        <Button
          key="create"
          onClick={() => navigate('/maas/tiers')}
          variant="primary"
          data-testid="create-tier-button"
          isDisabled={!canSubmit}
        >
          Create tier
        </Button>
        <Button
          key="cancel"
          onClick={() => navigate('/maas/tiers')}
          variant="link"
          data-testid="cancel-tier-button"
        >
          Cancel
        </Button>
      </ActionGroup>
    </Form>
  );
};

export default CreateTierForm;
