import * as React from 'react';
import { Checkbox } from '@patternfly/react-core';
import SettingSection from '~/components/SettingSection';

type TelemetrySettingsProps = {
  initialValue: boolean;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

const TelemetrySettings: React.FC<TelemetrySettingsProps> = ({
  initialValue,
  enabled,
  setEnabled,
}) => {
  React.useEffect(() => {
    if (initialValue) {
      setEnabled(initialValue);
    }
  }, [initialValue, setEnabled]);

  return (
    <SettingSection title="Usage data collection">
      <Checkbox
        label="Allow collection of usage data"
        isChecked={enabled}
        onChange={() => {
          setEnabled(!enabled);
        }}
        aria-label="usageData"
        id="usage-data-checkbox"
        data-testid="usage-data-checkbox"
        name="usageDataCheckbox"
      />
    </SettingSection>
  );
};

export default TelemetrySettings;
