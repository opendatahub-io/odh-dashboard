import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { useNotification } from '@odh-dashboard/ui-core';
import { useTrackEvent } from '@odh-dashboard/analytics/react';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import {
  getTemplateEnabled,
  setListDisabled,
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
} from '@odh-dashboard/model-serving/shared';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { isUnsupportedUnaccepted } from '@odh-dashboard/model-serving/concepts/versions';
import {
  UnsupportedStatusAcceptanceModal,
  type UnsupportedStatusDismissAction,
} from '@odh-dashboard/model-serving/shared/components';
import {
  fireRiskAccepted,
  fireRiskDismissed,
  getResourceVersions,
} from '@odh-dashboard/model-serving/shared/tracking/limitedSupportTracking';
import { useDashboardNamespace } from '@odh-dashboard/plugin-core/host-api';
import { patchDashboardConfigTemplateDisablementBackend } from '@odh-dashboard/internal/services/dashboardService';
import { patchTemplateAcceptedAnnotationBackend } from '@odh-dashboard/internal/services/templateService';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';
import { fireServingRuntimeTemplateEnablementChanged } from './tracking/servingRuntimeTemplateTracking';

type CustomServingRuntimeEnabledToggleProps = {
  template: TemplateKind;
};

const CustomServingRuntimeEnabledToggle: React.FC<CustomServingRuntimeEnabledToggleProps> = ({
  template,
}) => {
  const trackEvent = useTrackEvent();
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
  const servingRuntimeName = getServingRuntimeNameFromTemplate(template);

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
          fireServingRuntimeTemplateEnablementChanged(trackEvent, {
            outcome: TrackingOutcome.submit,
            success: true,
            enabled: checked,
          });
          refreshDisablement();
        })
        .catch((e) => {
          notification.error(
            `Error ${checked ? 'enabling' : 'disabling'} the serving runtime`,
            e.message,
          );
          fireServingRuntimeTemplateEnablementChanged(trackEvent, {
            outcome: TrackingOutcome.submit,
            success: false,
            // The patch failed, so the state reverts — report the actual state, not the intended one.
            enabled: !checked,
          });
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
      trackEvent,
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
        fireRiskAccepted(trackEvent, {
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
  }, [template, enableTemplate, notification, trackEvent]);

  return (
    <>
      <Switch
        id={`custom-serving-runtime-enabled-toggle-${servingRuntimeName}`}
        aria-label={`${servingRuntimeName}-enabled-toggle`}
        data-testid={`custom-serving-runtime-enabled-toggle-${servingRuntimeName}`}
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
            fireRiskDismissed(trackEvent, {
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
