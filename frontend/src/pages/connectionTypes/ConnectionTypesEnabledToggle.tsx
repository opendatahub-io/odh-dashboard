import * as React from 'react';
import { Switch } from '@patternfly/react-core';

const ConnectionTypesEnabledToggle: React.FC = () => {
  const [isEnabled, setEnabled] = React.useState(true);

  const handleChange = () => {
    //TODO: Put logic for patch
    setEnabled(!isEnabled);
  };
  return (
    <Switch
      id="custom-serving-runtime-enabled-toggle"
      isChecked={isEnabled}
      aria-label="connectionType-enabled-toggle"
      onChange={() => handleChange()}
    />
  );
};

export default ConnectionTypesEnabledToggle;
