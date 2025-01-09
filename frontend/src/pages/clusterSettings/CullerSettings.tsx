import * as React from 'react';
import {
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupText,
  Radio,
  Stack,
  StackItem,
  TextInput,
  InputGroupItem,
} from '@patternfly/react-core';
import { getHourAndMinuteByTimeout, getTimeoutByHourAndMinute } from '~/utilities/utils';
import CollapsibleSettingSection from '~/components/CollapsibleSettingSection';
import {
  CULLER_TIMEOUT_LIMITED,
  CULLER_TIMEOUT_UNLIMITED,
  DEFAULT_CULLER_TIMEOUT,
  DEFAULT_HOUR,
  MAX_HOUR,
  MAX_MINUTE,
  MIN_CULLER_TIMEOUT,
  MIN_HOUR,
  MIN_MINUTE,
} from './const';

type CullerSettingsProps = {
  initialValue: number;
  cullerTimeout: number;
  setCullerTimeout: (timeout: number) => void;
};

const CullerSettings: React.FC<CullerSettingsProps> = ({
  initialValue,
  cullerTimeout,
  setCullerTimeout,
}) => {
  const [cullerTimeoutChecked, setCullerTimeoutChecked] =
    React.useState<string>(CULLER_TIMEOUT_UNLIMITED);
  const [hour, setHour] = React.useState(DEFAULT_HOUR);
  const [minute, setMinute] = React.useState(0);

  React.useEffect(() => {
    setCullerTimeout(initialValue);
    if (initialValue !== DEFAULT_CULLER_TIMEOUT) {
      setCullerTimeoutChecked(CULLER_TIMEOUT_LIMITED);
      setHour(getHourAndMinuteByTimeout(initialValue).hour);
      setMinute(getHourAndMinuteByTimeout(initialValue).minute);
    }
  }, [initialValue, setCullerTimeout]);

  React.useEffect(() => {
    if (cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED) {
      setCullerTimeout(DEFAULT_CULLER_TIMEOUT);
    } else if (cullerTimeoutChecked === CULLER_TIMEOUT_LIMITED) {
      setCullerTimeout(getTimeoutByHourAndMinute(hour, minute));
    }
  }, [hour, minute, cullerTimeoutChecked, setCullerTimeout]);

  const radioCheckedChange: React.ComponentProps<typeof Radio>['onChange'] = (event) => {
    const { value } = event.currentTarget;
    setCullerTimeoutChecked(value);
  };

  return (
    <CollapsibleSettingSection
      title="Stop idle notebooks"
      description="Set the time limit for idle notebooks to be stopped."
      footer={
        <HelperText>
          <HelperTextItem>
            All idle notebooks are stopped at cluster log out. To edit the cluster log out time,
            discuss with your OpenShift administrator to see if the OpenShift Authentication Timeout
            value can be modified.
          </HelperTextItem>
        </HelperText>
      }
    >
      <Stack hasGutter>
        <StackItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Radio
                id="culler-timeout-unlimited"
                data-testid="culler-timeout-unlimited"
                label="Do not stop idle notebooks"
                isChecked={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                name={CULLER_TIMEOUT_UNLIMITED}
                onChange={radioCheckedChange}
                value={CULLER_TIMEOUT_UNLIMITED}
              />
            </FlexItem>
            <FlexItem>
              <Radio
                id="culler-timeout-limited"
                data-testid="culler-timeout-limited"
                label="Stop idle notebooks after"
                isChecked={cullerTimeoutChecked === CULLER_TIMEOUT_LIMITED}
                name={CULLER_TIMEOUT_LIMITED}
                onChange={radioCheckedChange}
                value={CULLER_TIMEOUT_LIMITED}
                body={
                  <InputGroup>
                    <InputGroupItem>
                      <TextInput
                        id="hour-input"
                        style={{ maxWidth: '60px' }}
                        name="hour"
                        data-testid="hour-input"
                        type="text"
                        aria-label="Culler Timeout Hour Input"
                        value={hour}
                        isDisabled={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                        onChange={(e, value: string) => {
                          let newValue =
                            Number.isNaN(Number(value)) || !Number.isInteger(Number(value))
                              ? hour
                              : Number(value);
                          newValue =
                            newValue > MAX_HOUR
                              ? MAX_HOUR
                              : newValue < MIN_HOUR
                              ? MIN_HOUR
                              : newValue;
                          // if the hour is max, then the minute can only be set to 0
                          if (newValue === MAX_HOUR && minute !== MIN_MINUTE) {
                            setMinute(MIN_MINUTE);
                          }
                          setHour(newValue);
                        }}
                      />
                    </InputGroupItem>
                    <InputGroupText isPlain>hours</InputGroupText>
                    <InputGroupItem>
                      <TextInput
                        id="minute-input"
                        style={{ maxWidth: '60px' }}
                        name="minute"
                        data-testid="minute-input"
                        type="text"
                        aria-label="Culler Timeout Minute Input"
                        value={minute}
                        isDisabled={cullerTimeoutChecked === CULLER_TIMEOUT_UNLIMITED}
                        onChange={(e, value: string) => {
                          let newValue =
                            Number.isNaN(Number(value)) || !Number.isInteger(Number(value))
                              ? minute
                              : Number(value);
                          newValue =
                            newValue > MAX_MINUTE
                              ? MAX_MINUTE
                              : newValue < MIN_MINUTE
                              ? MIN_MINUTE
                              : newValue;
                          // if the hour is max, then the minute can only be set to 0
                          if (hour === MAX_HOUR) {
                            newValue = MIN_MINUTE;
                          }
                          setMinute(newValue);
                        }}
                      />
                    </InputGroupItem>
                    <InputGroupText isPlain>minutes</InputGroupText>
                  </InputGroup>
                }
              />
            </FlexItem>
          </Flex>
        </StackItem>
        <StackItem>
          <HelperText>
            <HelperTextItem
              data-testid="culler-timeout-helper-text"
              variant={cullerTimeout < MIN_CULLER_TIMEOUT ? 'error' : 'default'}
            >
              Note: Notebook culler timeout must be between 10 minutes and 1000 hours.
            </HelperTextItem>
          </HelperText>
        </StackItem>
      </Stack>
    </CollapsibleSettingSection>
  );
};

export default CullerSettings;
