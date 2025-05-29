import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { TemplateKind } from '#~/k8sTypes';
import useNotification from '#~/utilities/useNotification';
import { useDashboardNamespace } from '#~/redux/selectors';
import { patchDashboardConfigTemplateDisablementBackend } from '#~/services/dashboardService';
import { getTemplateEnabled, setListDisabled } from './utils';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

type CustomServingRuntimeEnabledToggleProps = {
  template: TemplateKind;
};

const CustomServingRuntimeEnabledToggle: React.FC<CustomServingRuntimeEnabledToggleProps> = ({
  template,
}) => {
  const {
    servingRuntimeTemplateDisablement: {
      data: templateDisablement,
      loaded: templateDisablementLoaded,
      refresh: refreshDisablement,
    },
    servingRuntimeTemplates: [templates],
  } = React.useContext(CustomServingRuntimeContext);
  const { dashboardNamespace } = useDashboardNamespace();
  const [isEnabled, setEnabled] = React.useState(true);
  const [isLoading, setLoading] = React.useState(false);
  const notification = useNotification();

  React.useEffect(() => {
    if (templateDisablementLoaded) {
      setEnabled(getTemplateEnabled(template, templateDisablement));
    }
  }, [template, templateDisablement, templateDisablementLoaded]);

  const handleChange = (checked: boolean) => {
    setLoading(true);
    const templateDisablemetUpdated = setListDisabled(
      template,
      templates,
      templateDisablement,
      !checked,
    );
    // TODO: Revert back to pass through api once we migrate admin panel
    patchDashboardConfigTemplateDisablementBackend(templateDisablemetUpdated, dashboardNamespace)
      .then(() => {
        setEnabled(checked);
        refreshDisablement();
      })
      .catch((e) => {
        notification.error(
          `Error ${checked ? 'enable' : 'disable'} the serving runtime`,
          e.message,
        );
        setEnabled(!checked);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Switch
      id={`custom-serving-runtime-enabled-toggle-${template.metadata.name}`}
      aria-label={`${template.metadata.name}-enabled-toggle`}
      isChecked={isEnabled}
      onChange={(e, checked: boolean) => handleChange(checked)}
      isDisabled={isLoading}
    />
  );
};

export default CustomServingRuntimeEnabledToggle;
