import React from 'react';
import { Checkbox, FormGroup } from '@patternfly/react-core';
import NumberInputWrapper from '#~/components/NumberInputWrapper';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip.tsx';

type TimeoutFieldProps = {
  timeoutValue: number;
  onChangeTimeoutValue: (value: number) => void;
  redirectOnTokenExpiry: boolean;
  onChangeRedirectOnTokenExpiry: (value: boolean) => void;
};

export const TimeoutField: React.FC<TimeoutFieldProps> = ({
  timeoutValue,
  onChangeTimeoutValue,
  redirectOnTokenExpiry,
  onChangeRedirectOnTokenExpiry: onChangeUseKubeRBAC,
}) => {
  return (
    <>
      <FormGroup label="Model route timeout" fieldId="model-route-timeout">
        <NumberInputWrapper
          min={0}
          max={1000000}
          value={timeoutValue}
          onChange={(newValue?: number) => onChangeTimeoutValue(newValue ?? 0)}
          increment={5}
          unit="seconds"
        />
      </FormGroup>
      <FormGroup
        label="RBAC"
        fieldId="use-kubernetes-rbac-for-authentication"
        labelHelp={
          <DashboardHelpTooltip
            content={
              <>
                Delegates authentication to the Kubernetes API using <code>kube-rbac-proxy</code>.
                This ensures unauthorized requests return an HTTP 401 status code instead of an HTTP
                302 redirect.
              </>
            }
          />
        }
      >
        <Checkbox
          label="Use Kubernetes RBAC for authentication"
          id="use-kubernetes-rbac-for-authentication"
          name="use-kubernetes-rbac-for-authentication"
          isChecked={redirectOnTokenExpiry}
          onChange={(e, checked) => onChangeUseKubeRBAC(checked)}
        />
      </FormGroup>
    </>
  );
};
