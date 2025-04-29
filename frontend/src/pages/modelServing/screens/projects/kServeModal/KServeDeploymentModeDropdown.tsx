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
              <ul style={{ paddingLeft: '1.2em', margin: 0 }}>
                <li>
                  <strong>Advanced</strong>: Knative Serverless, autoscaling, some customization
                  limits.
                </li>
                <li>
                  <strong>Standard</strong>: Kubernetes resources, simpler setup, no autoscaling to
                  zero.
                </li>
              </ul>
              <div style={{ marginTop: '0.5em' }}>
                <a
                  href="https://github.com/opendatahub-io/opendatahub-documentation/blob/main/modules/about-kserve-deployment-modes.adoc"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more about deployment modes
                </a>
              </div>
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
