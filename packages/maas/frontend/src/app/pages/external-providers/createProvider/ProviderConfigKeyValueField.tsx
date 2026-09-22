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
      <FormGroup label="Provider configuration" fieldId="provider-configuration">
        <StackItem>
          <p>
            Define key-value pairs for this provider. These pairs are inherited by all models that
            reference this provider. If a model&apos;s request path contains a placeholder such as{' '}
            {`{project}`}, the system replaces it with the matching value defined here.
          </p>
        </StackItem>
        <ConfigPairsEditor
          pairs={pairs}
          onChange={onChange}
          testIdPrefix="provider-config"
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
