import React from 'react';
import { Checkbox, FormGroup } from '@patternfly/react-core';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import DashboardHelpTooltip from '@odh-dashboard/internal/concepts/dashboard/DashboardHelpTooltip';

export type TimeoutConfigData = {
  enableTimeoutConfig?: boolean;
  timeout?: number;
  return401?: boolean;
};

export type TimeoutConfigFieldData = TimeoutConfigData;

// Hook
export type TimeoutFieldHook = {
  data: TimeoutConfigData;
  setData: (data: TimeoutConfigData) => void;
};

const DEFAULT_TIMEOUT = 30;

export const useTimeoutField = (existingData?: TimeoutConfigData): TimeoutFieldHook => {
  const [timeoutData, setTimeoutData] = React.useState<TimeoutConfigData>(
    () =>
      existingData ?? {
        enableTimeoutConfig: true,
        timeout: DEFAULT_TIMEOUT,
        return401: false,
      },
  );

  return {
    data: timeoutData,
    setData: setTimeoutData,
  };
};

// Component
type TimeoutFieldProps = {
  timeoutValue: number;
  onChangeTimeoutValue: (value: number) => void;
  return401: boolean;
  onChangeReturn401: (value: boolean) => void;
};

export const TimeoutField: React.FC<TimeoutFieldProps> = ({
  timeoutValue,
  onChangeTimeoutValue,
  return401,
  onChangeReturn401,
}) => (
  <>
    <FormGroup label="Model route timeout" fieldId="model-route-timeout">
      <NumberInputWrapper
        min={0}
        max={1000000}
        value={timeoutValue}
        onChange={(newValue?: number) => onChangeTimeoutValue(newValue ?? 30)}
        increment={5}
        unit="seconds"
      />
    </FormGroup>
    <FormGroup
      label="Authentication failure handling"
      fieldId="auth-failure-handling"
      labelHelp={
        <DashboardHelpTooltip
          content={
            <>
              If enabled, unauthorized requests will return a 401 Unauthorized status, instead of
              redirecting to the login page.
            </>
          }
        />
      }
    >
      <Checkbox
        label="Return 401 API Response"
        id="return-401-api-response"
        name="return-401-api-response"
        isChecked={return401}
        onChange={(e, checked) => onChangeReturn401(checked)}
      />
    </FormGroup>
  </>
);
