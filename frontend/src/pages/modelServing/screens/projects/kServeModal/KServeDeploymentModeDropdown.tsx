import { FormGroup, Icon, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { DeploymentMode } from '#~/k8sTypes';

type Props = {
  isRaw: boolean;
  setIsRaw: (isRaw: boolean) => void;
  isDisabled?: boolean;
};

export const KServeDeploymentModeDropdown: React.FC<Props> = ({ isRaw, setIsRaw, isDisabled }) => {
  const options: SimpleSelectOption[] = [
    {
      label: `KServe RawDeployment`,
      key: DeploymentMode.RawDeployment,
    },
    {
      label: `Knative Serverless`,
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
              <div>
                The selected deployment mode determines how the model server runs in your
                environment.
              </div>
              <ul
                style={{
                  listStyleType: 'disc',
                  paddingLeft: '1.5rem',
                  marginTop: '0.5rem',
                  marginBottom: 0,
                }}
              >
                <li>
                  <strong>Knative Serverless</strong>: Autoscale to and from zero based on request
                  volume with minimal customization. Recommended for most workloads.
                </li>
                <li>
                  <strong>KServe RawDeployment</strong>: Always running with no autoscaling. Use for
                  custom serving setups or if your model needs to stay active.
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
