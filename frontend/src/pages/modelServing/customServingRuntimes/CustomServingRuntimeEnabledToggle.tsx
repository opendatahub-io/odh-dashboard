import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { TemplateKind } from '~/k8sTypes';
import { toggleTemplateEnabledStatus } from '~/api';
import useNotification from '~/utilities/useNotification';
import { getTemplateEnabled } from './utils';

type CustomServingRuntimeEnabledToggleProps = {
  template: TemplateKind;
};

const CustomServingRuntimeEnabledToggle: React.FC<CustomServingRuntimeEnabledToggleProps> = ({
  template,
}) => {
  const [isEnabled, setEnabled] = React.useState(getTemplateEnabled(template));
  const [isLoading, setLoading] = React.useState(false);
  const notification = useNotification();

  const handleChange = (checked: boolean) => {
    setLoading(true);
    toggleTemplateEnabledStatus(template.metadata.name, template.metadata.namespace, checked)
      .then(() => {
        setEnabled(checked);
        setLoading(false);
      })
      .catch((e) => {
        notification.error(
          `Error ${checked ? 'enable' : 'disable'} the serving runtime`,
          e.message,
        );
        setEnabled(!checked);
        setLoading(false);
      });
  };

  return (
    <Switch
      id={`custom-serving-runtime-enabled-toggle-${template.metadata.name}`}
      aria-label={`${template.metadata.name}-enabled-toggle`}
      isChecked={isEnabled}
      onChange={handleChange}
      isDisabled={isLoading}
    />
  );
};

export default CustomServingRuntimeEnabledToggle;
