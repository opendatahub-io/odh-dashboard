import * as React from 'react';
import { Checkbox, Content, ContentVariants } from '@patternfly/react-core';
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
    <SettingSection
      title="Usage data collection"
      footer={
        <Content component={ContentVariants.small}>
          For more information see the{' '}
          <Content
            component={ContentVariants.a}
            href="https://docs.redhat.com/en/documentation/red_hat_openshift_ai_cloud_service/1/html/managing_resources/managing-collection-of-usage-data"
            target="_blank"
          >
            documentation
          </Content>
          .
        </Content>
      }
    >
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
