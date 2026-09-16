import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import ConfigPairsEditor from '~/app/components/ConfigPairsEditor';
import { ConfigPair, countNonEmptyConfigPairs } from '~/app/utilities/configPairs';

type ProviderConfigKeyValueFieldProps = {
  pairs: ConfigPair[];
  onChange: (pairs: ConfigPair[]) => void;
};

export const ProviderConfigurationSection: React.FC<
  ProviderConfigKeyValueFieldProps & { validationMessage?: string }
> = ({ pairs, onChange, validationMessage }) => (
  <Stack hasGutter>
    <StackItem>
      <p>
        Define key-value pairs for this provider. Values are only used as {'{key}'} placeholders in
        the model&apos;s path field — they do not affect other configuration. All models referencing
        this provider inherit these pairs.
      </p>
      <p>
        For example, Vertex AI providers typically need <strong>project</strong> and{' '}
        <strong>location</strong> keys (for example, project=my-gcp-project, location=us-central1).
        AWS Bedrock may need <strong>region</strong>.
      </p>
    </StackItem>
    <StackItem>
      <FormGroup label="Provider configuration" fieldId="provider-configuration">
        <ConfigPairsEditor
          pairs={pairs}
          onChange={onChange}
          testIdPrefix="provider-config"
          ensureEmptyRow
          addButtonTestId="add-provider-config-pair-button"
        />
        {validationMessage && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">{validationMessage}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>
    </StackItem>
  </Stack>
);

export { countNonEmptyConfigPairs };

export default ProviderConfigurationSection;
