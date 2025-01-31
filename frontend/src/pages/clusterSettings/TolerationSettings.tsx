import * as React from 'react';
import {
  Checkbox,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { NotebookTolerationFormSettings } from '~/types';
import CollapsibleSettingSection from '~/components/CollapsibleSettingSection';
import { DEFAULT_TOLERATION_VALUE, TOLERATION_FORMAT, TOLERATION_FORMAT_ERROR } from './const';

type TolerationSettingsProps = {
  initialValue: NotebookTolerationFormSettings | null;
  tolerationSettings: NotebookTolerationFormSettings;
  setTolerationSettings: (settings: NotebookTolerationFormSettings) => void;
};

const TolerationSettings: React.FC<TolerationSettingsProps> = ({
  initialValue,
  tolerationSettings,
  setTolerationSettings,
}) => {
  React.useEffect(() => {
    if (initialValue) {
      setTolerationSettings(initialValue);
    }
  }, [initialValue, setTolerationSettings]);

  return (
    <CollapsibleSettingSection
      title="Notebook pod tolerations"
      footer={
        <HelperText>
          {tolerationSettings.error && (
            <HelperTextItem data-testid="toleration-helper-text-error" variant="error">
              {tolerationSettings.error}
            </HelperTextItem>
          )}
          <HelperTextItem>
            The toleration key above will be applied to all notebook pods when they are created. Add
            a matching taint key (with any value) to the Machine Pool(s) that you want to dedicate
            to Notebooks.
          </HelperTextItem>
        </HelperText>
      }
    >
      <Stack hasGutter>
        <StackItem>
          <Checkbox
            label="Add a toleration to notebook pods to allow them to be scheduled to tainted nodes"
            isChecked={tolerationSettings.enabled}
            onChange={(e, enabled) => {
              const newNotebookTolerationSettings: NotebookTolerationFormSettings = {
                ...tolerationSettings,
                enabled,
              };
              setTolerationSettings(newNotebookTolerationSettings);
            }}
            aria-label="tolerationsEnabled"
            id="tolerations-enabled-checkbox"
            data-testid="tolerations-enabled-checkbox"
            name="tolerationsEnabledCheckbox"
            body={
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>Toleration key for notebook pods:</FlexItem>
                <FlexItem>
                  <TextInput
                    id="toleration-key-input"
                    isDisabled={!tolerationSettings.enabled}
                    style={{ maxWidth: '200px' }}
                    name="tolerationKey"
                    data-testid="toleration-key-input"
                    type="text"
                    aria-label="Toleration key"
                    value={tolerationSettings.key}
                    placeholder={DEFAULT_TOLERATION_VALUE}
                    validated={tolerationSettings.error ? ValidatedOptions.error : undefined}
                    onChange={(e, value: string) => {
                      const newNotebookTolerationSettings: NotebookTolerationFormSettings = {
                        ...tolerationSettings,
                        key: value,
                        error: TOLERATION_FORMAT.test(value) ? undefined : TOLERATION_FORMAT_ERROR,
                      };
                      setTolerationSettings(newNotebookTolerationSettings);
                    }}
                  />
                </FlexItem>
              </Flex>
            }
          />
        </StackItem>
      </Stack>
    </CollapsibleSettingSection>
  );
};

export default TolerationSettings;
