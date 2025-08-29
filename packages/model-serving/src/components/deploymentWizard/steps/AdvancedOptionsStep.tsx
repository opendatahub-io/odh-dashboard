import React from 'react';
import { Form } from '@patternfly/react-core';
import {
  AdvancedSettingsSelectField,
  AdvancedSettingsData,
  AdvancedSettingsValue,
} from '../fields/AdvancedSettingsSelectField';

type AdvancedSettingsStepContentProps = {
  tokenAuthAlert?: boolean;
};

export const AdvancedSettingsStepContent: React.FC<AdvancedSettingsStepContentProps> = ({
  tokenAuthAlert = false,
}) => {
  const [advancedSettings, setAdvancedSettings] = React.useState<AdvancedSettingsData>({
    externalRoute: false,
    tokenAuth: false,
    tokens: [],
  });

  const handleSetData = React.useCallback(
    (key: keyof AdvancedSettingsData, value: AdvancedSettingsValue) => {
      setAdvancedSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  return (
    <>
      <Form>
        <AdvancedSettingsSelectField
          data={advancedSettings}
          setData={handleSetData}
          allowCreate
          tokenAuthAlert={tokenAuthAlert}
        />
      </Form>
    </>
  );
};
