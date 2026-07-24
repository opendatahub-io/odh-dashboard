import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import {
  getTemplateEnabled,
  setListDisabled,
  getServingRuntimeDisplayNameFromTemplate,
} from '@odh-dashboard/model-serving/shared';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { isUnsupportedUnaccepted } from '@odh-dashboard/model-serving/concepts/versions';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import UnsupportedStatusAcceptanceModal from '@odh-dashboard/model-serving/components/UnsupportedStatusAcceptanceModal';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import type { UnsupportedStatusDismissAction } from '@odh-dashboard/model-serving/components/UnsupportedStatusAcceptanceModal';
import {
  fireRiskAccepted,
  fireRiskDismissed,
  getResourceVersions,
} from '@odh-dashboard/model-serving/shared/tracking/limitedSupportTracking';
import useNotification from '#~/utilities/useNotification';
import { useDashboardNamespace } from '#~/redux/selectors';
import { patchDashboardConfigTemplateDisablementBackend } from '#~/services/dashboardService';
import { patchTemplateAcceptedAnnotationBackend } from '#~/services/templateService';
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
  const [showAcceptanceModal, setShowAcceptanceModal] = React.useState(false);
  const notification = useNotification();

  const unsupportedUnaccepted = isUnsupportedUnaccepted(template);

  React.useEffect(() => {
    if (templateDisablementLoaded) {
      setEnabled(getTemplateEnabled(template, templateDisablement));
    }
  }, [template, templateDisablement, templateDisablementLoaded]);

  const effectiveEnabled = unsupportedUnaccepted ? false : isEnabled;

  const enableTemplate = React.useCallback(
    (checked: boolean) => {
      setLoading(true);
      const templateDisablementUpdated = setListDisabled(
        template,
        templates,
        templateDisablement,
        !checked,
      );
      // TODO: Revert back to pass through api once we migrate admin panel
      patchDashboardConfigTemplateDisablementBackend(templateDisablementUpdated, dashboardNamespace)
        .then(() => {
          setEnabled(checked);
          refreshDisablement();
        })
        .catch((e) => {
          notification.error(
            `Error ${checked ? 'enabling' : 'disabling'} the serving runtime`,
            e.message,
          );
          setEnabled(!checked);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [
      template,
      templates,
      templateDisablement,
      dashboardNamespace,
      refreshDisablement,
      notification,
    ],
  );

  const handleChange = React.useCallback(
    (_event: React.FormEvent, checked: boolean) => {
      if (checked && unsupportedUnaccepted) {
        setShowAcceptanceModal(true);
      } else {
        enableTemplate(checked);
      }
    },
    [unsupportedUnaccepted, enableTemplate],
  );

  const handleAccept = React.useCallback(() => {
    setShowAcceptanceModal(false);
    setLoading(true);
    // TODO: Use passthrough API once admin panel has been migrated to support it
    patchTemplateAcceptedAnnotationBackend(template.metadata.namespace, template.metadata.name)
      .then(() => {
        fireRiskAccepted({
          runtimeResourceType: 'serving-runtime-template',
          resourceId: template.metadata.name,
          resourceName: getServingRuntimeDisplayNameFromTemplate(template),
          ...getResourceVersions(template),
          outcome: 'submit',
          success: true,
        });
        enableTemplate(true);
      })
      .catch((e) => {
        notification.error(
          'Error accepting the unsupported serving runtime',
          e instanceof Error ? e.message : String(e),
        );
        setLoading(false);
      });
  }, [template, enableTemplate, notification]);

  return (
    <>
      <Switch
        id={`custom-serving-runtime-enabled-toggle-${template.metadata.name}`}
        aria-label={`${template.metadata.name}-enabled-toggle`}
        data-testid={`custom-serving-runtime-enabled-toggle-${template.metadata.name}`}
        isChecked={effectiveEnabled}
        onChange={handleChange}
        isDisabled={isLoading}
      />
      {showAcceptanceModal ? (
        <UnsupportedStatusAcceptanceModal
          resourceTypeLabel="runtime"
          onAccept={handleAccept}
          onClose={(dismissAction: UnsupportedStatusDismissAction) => {
            setShowAcceptanceModal(false);
            fireRiskDismissed({
              runtimeResourceType: 'serving-runtime-template',
              resourceId: template.metadata.name,
              resourceName: getServingRuntimeDisplayNameFromTemplate(template),
              ...getResourceVersions(template),
              dismissAction,
              outcome: 'cancel',
            });
          }}
        />
      ) : null}
    </>
  );
};

export default CustomServingRuntimeEnabledToggle;
