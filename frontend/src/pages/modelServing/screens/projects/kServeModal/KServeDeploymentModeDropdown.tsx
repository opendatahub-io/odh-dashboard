import { FormGroup, Icon, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { DeploymentMode } from '~/k8sTypes';

type Props = {
  isRaw: boolean;
  setIsRaw: (isRaw: boolean) => void;
  isDisabled?: boolean;
};

export const KServeDeploymentModeDropdown: React.FC<Props> = ({ isRaw, setIsRaw, isDisabled }) => {
  const options: SimpleSelectOption[] = [
    {
      label: `Standard`,
      key: DeploymentMode.RawDeployment,
    },
    {
      label: `Advanced`,
      key: DeploymentMode.Serverless,
    },
  ];

  return (
    <FormGroup
      label="Deployment mode"
      fieldId="deployment-mode"
      isRequired
      labelHelp={
        <Popover
          bodyContent={
            <>
              <div>Deployment modes determine the technology used to deploy your model:</div>
              <ul
                style={{
                  listStyleType: 'disc',
                  paddingLeft: '1.5rem',
                  marginTop: '0.5rem',
                  marginBottom: 0,
                }}
              >
                <li>
                  <strong>Advanced</strong>: Uses Knative Serverless but requires some manual
                  customization. Supports autoscaling.
                </li>
                <li>
                  <strong>Standard</strong>: Uses Kubernetes resources with fewer dependencies and a
                  simpler setup. Does not support autoscaling.
                </li>
              </ul>
            </>
          }
        >
          <Icon aria-label="Deployment mode info" role="button">
            <OutlinedQuestionCircleIcon />
          </Icon>
        </Popover>
      }
    >
      <SimpleSelect
        dataTestId="deployment-mode-select"
        isDisabled={isDisabled}
        value={isRaw ? DeploymentMode.RawDeployment : DeploymentMode.Serverless}
        options={options}
        onChange={(key) => {
          setIsRaw(key === DeploymentMode.RawDeployment);
        }}
        isFullWidth
      />
    </FormGroup>
  );
};