import * as React from 'react';
import { Checkbox, FormGroup } from '@patternfly/react-core';
import useBrowserTabPreference from './useBrowserTabPreference';

const BrowserTabPreferenceCheckbox: React.FC = () => {
  const [isUsingCurrentTab, setUsingCurrentTab] = useBrowserTabPreference();

  const handleChange = (checked: boolean) => {
    setUsingCurrentTab(checked);
  };

  return (
    <FormGroup fieldId="checkbox-notebook-browser-tab-preference">
      <Checkbox
        id="checkbox-notebook-browser-tab-preference"
        name="checkbox-notebook-browser-tab-preference"
        isChecked={isUsingCurrentTab}
        label="Start workbench in current tab"
        onChange={(e, checked) => handleChange(checked)}
      />
    </FormGroup>
  );
};

export default BrowserTabPreferenceCheckbox;
