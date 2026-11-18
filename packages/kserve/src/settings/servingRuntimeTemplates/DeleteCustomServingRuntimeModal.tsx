import * as React from 'react';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { useTrackEvent } from '@odh-dashboard/analytics/react';
import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getTemplateEnabled,
  setListDisabled,
} from '@odh-dashboard/model-serving/shared';
import DeleteModal from '@odh-dashboard/ui-core/components/DeleteModal';
import { useDashboardNamespace } from '@odh-dashboard/plugin-core/host-api';
import { deleteTemplateBackend } from '@odh-dashboard/internal/services/templateService';
import { patchDashboardConfigTemplateDisablementBackend } from '@odh-dashboard/internal/services/dashboardService';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';
import { fireServingRuntimeTemplateDeleted } from './tracking/servingRuntimeTemplateTracking';

type DeleteCustomServingRuntimeModalProps = {
  template: TemplateKind;
  onClose: (deleted: boolean) => void;
};

const DeleteCustomServingRuntimeModal: React.FC<DeleteCustomServingRuntimeModalProps> = ({
  template,
  onClose,
}) => {
  const trackEvent = useTrackEvent();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const {
    servingRuntimeTemplateDisablement: { data: templateDisablement },
    servingRuntimeTemplates: [templates],
  } = React.useContext(CustomServingRuntimeContext);

  const { dashboardNamespace } = useDashboardNamespace();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = getServingRuntimeDisplayNameFromTemplate(template);

  return (
    <DeleteModal
      title="Delete serving runtime?"
      onClose={() => {
        fireServingRuntimeTemplateDeleted(trackEvent, { outcome: TrackingOutcome.cancel });
        onBeforeClose(false);
      }}
      submitButtonLabel="Delete serving runtime"
      onDelete={() => {
        setIsDeleting(true);
        // TODO: Revert back to pass through api once we migrate admin panel
        const templateDisablemetUpdated = setListDisabled(
          template,
          templates,
          templateDisablement,
          false,
        );
        Promise.all([
          ...(!getTemplateEnabled(template, templateDisablement)
            ? [
                patchDashboardConfigTemplateDisablementBackend(
                  templateDisablemetUpdated,
                  dashboardNamespace,
                ),
              ]
            : []),
          deleteTemplateBackend(template.metadata.name, template.metadata.namespace),
        ])
          .then(() => {
            fireServingRuntimeTemplateDeleted(trackEvent, {
              outcome: TrackingOutcome.submit,
              success: true,
            });
            onBeforeClose(true);
          })
          .catch((e) => {
            fireServingRuntimeTemplateDeleted(trackEvent, {
              outcome: TrackingOutcome.submit,
              success: false,
            });
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={deleteName}
    >
      This action cannot be undone. Models already deployed using this runtime will not be affected
      by this action.
    </DeleteModal>
  );
};

export default DeleteCustomServingRuntimeModal;
