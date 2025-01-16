import { FormGroup, Icon, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { DeploymentMode } from '~/k8sTypes';
import { useDefaultDeploymentMode } from '~/pages/modelServing/useDefaultDeploymentMode';

type Props = {
  isRaw: boolean;
  setIsRaw: (isRaw: boolean) => void;
  isDisabled?: boolean;
};

export const KServeDeploymentModeDropdown: React.FC<Props> = ({ isRaw, setIsRaw, isDisabled }) => {
  const defaultDeploymentMode = useDefaultDeploymentMode();

  const options: SimpleSelectOption[] = React.useMemo(
    () => [
      {
        label: `Standard${
          defaultDeploymentMode === DeploymentMode.RawDeployment ? ' (default)' : ''
        }`,
        key: DeploymentMode.RawDeployment,
      },
      {
        label: `Advanced${defaultDeploymentMode === DeploymentMode.Serverless ? ' (default)' : ''}`,
        key: DeploymentMode.Serverless,
      },
    ],
    [defaultDeploymentMode],
  );

  return (
    <FormGroup
      label="Deployment mode"
      fieldId="deployment-mode"
      isRequired
      labelHelp={
        <Popover bodyContent="Deployment modes define which technology stack will be used to deploy a model, offering different levels of management and scalability.">
          <Icon aria-label="Model server replicas info" role="button">
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
