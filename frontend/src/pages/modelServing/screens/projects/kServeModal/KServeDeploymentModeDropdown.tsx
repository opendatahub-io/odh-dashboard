import { FormGroup, Icon, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';

enum DeploymentMode {
  Advanced = 'advanced',
  Standard = 'standard',
}

const options: SimpleSelectOption[] = [
  {
    label: 'Standard',
    key: DeploymentMode.Standard,
  },
  {
    label: 'Advanced (default)',
    key: DeploymentMode.Advanced,
  },
];

type Props = {
  isRaw: boolean;
  setIsRaw: (isRaw: boolean) => void;
  isDisabled?: boolean;
};

export const KServeDeploymentModeDropdown: React.FC<Props> = ({ isRaw, setIsRaw, isDisabled }) => (
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
      value={isRaw ? DeploymentMode.Standard : DeploymentMode.Advanced}
      options={options}
      onChange={(key) => {
        setIsRaw(key === DeploymentMode.Standard);
      }}
      isFullWidth
    />
  </FormGroup>
);
