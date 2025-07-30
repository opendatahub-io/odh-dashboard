import { Checkbox } from '@patternfly/react-core';
import React from 'react';

type PipelineKubernetesStoreCheckboxProps = {
  isChecked: boolean;
  onChange?: (event: React.FormEvent<HTMLInputElement>, isChecked: boolean) => void;
  id?: string;
  dataTestId?: string;
  isDisabled?: boolean;
};

const PipelineKubernetesStoreCheckbox = ({
  isChecked,
  onChange,
  id = 'pipeline-kubernetes-store-checkbox',
  dataTestId = 'pipeline-kubernetes-store-checkbox',
  isDisabled = false,
}: PipelineKubernetesStoreCheckboxProps): React.JSX.Element => (
  <Checkbox
    id={id}
    data-testid={dataTestId}
    label="Store pipeline definitions in Kubernetes"
    description="Store pipeline specifications as Kubernetes resources. This enables version control, GitOps workflows, and easier integration with tools like OpenShift GitOps."
    isDisabled={isDisabled}
    isChecked={isChecked}
    onChange={onChange}
  />
);

export default PipelineKubernetesStoreCheckbox;
