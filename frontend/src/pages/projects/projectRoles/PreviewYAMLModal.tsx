import * as React from 'react';
import { Language } from '@patternfly/react-code-editor';
import YAML from 'yaml';
import type { ClusterRoleKind, RoleKind } from '#~/k8sTypes';
import { getRoleDisplayName } from '#~/concepts/permissions/utils';
import type { RoleRef } from '#~/concepts/permissions/types';
import DashboardCodeEditor from '#~/concepts/dashboard/codeEditor/DashboardCodeEditor';
import ContentModal from '#~/components/modals/ContentModal';

type PreviewYAMLModalProps = {
  roleRef: RoleRef;
  role: RoleKind | ClusterRoleKind;
  onClose: () => void;
};

const PreviewYAMLModal: React.FC<PreviewYAMLModalProps> = ({ roleRef, role, onClose }) => {
  const yamlContent = React.useMemo(() => YAML.stringify(role), [role]);
  const displayName = getRoleDisplayName(roleRef, role);

  return (
    <ContentModal
      variant="large"
      onClose={onClose}
      dataTestId="preview-yaml-modal"
      title={`${displayName} YAML`}
      bodyClassName=""
      buttonActions={[
        {
          label: 'Close',
          onClick: onClose,
          variant: 'link',
          dataTestId: 'preview-yaml-close-button',
        },
      ]}
      contents={
        <DashboardCodeEditor
          code={yamlContent}
          isReadOnly
          isLanguageLabelVisible
          isCopyEnabled
          isDownloadEnabled
          downloadFileName={`${role.metadata.name}.yaml`}
          language={Language.yaml}
          codeEditorHeight="500px"
          testId="preview-yaml-editor"
        />
      }
    />
  );
};

export default PreviewYAMLModal;
