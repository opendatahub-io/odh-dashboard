import * as React from 'react';
import { Form, FormGroup, Switch, AlertGroup } from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ChatbotSourceUploadPanel } from '~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';
import UploadedFilesList from '~/app/Chatbot/components/UploadedFilesList';
import { useChatbotConfigStore, selectRagEnabled, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';

interface KnowledgeTabContentProps {
  configId?: string;
  sourceManagement: UseSourceManagementReturn;
  fileManagement: UseFileManagementReturn;
  alerts: {
    uploadSuccessAlert: React.ReactElement | undefined;
    deleteSuccessAlert: React.ReactElement | undefined;
    errorAlert: React.ReactElement | undefined;
  };
}

const KnowledgeTabContent: React.FunctionComponent<KnowledgeTabContentProps> = ({
  configId = DEFAULT_CONFIG_ID,
  sourceManagement,
  fileManagement,
  alerts,
}) => {
  // Per-pane RAG toggle from Zustand store
  const isRagEnabled = useChatbotConfigStore(selectRagEnabled(configId));
  const updateRagEnabled = useChatbotConfigStore((state) => state.updateRagEnabled);

  const headerActions = (
    <Switch
      id="rag-toggle-switch"
      isChecked={isRagEnabled}
      data-testid="rag-toggle-switch"
      onChange={(_, checked) => {
        updateRagEnabled(configId, checked);
        fireMiscTrackingEvent('Playground RAG Toggle Selected', {
          isRag: checked,
        });
      }}
      aria-label="Toggle RAG mode"
    />
  );

  return (
    <TabContentWrapper title="RAG" headerActions={headerActions} titleTestId="rag-section-title">
      <Form>
        <FormGroup fieldId="sources">
          <ChatbotSourceUploadPanel
            successAlert={alerts.uploadSuccessAlert}
            errorAlert={alerts.errorAlert}
            handleSourceDrop={sourceManagement.handleSourceDrop}
            removeUploadedSource={sourceManagement.removeUploadedSource}
            filesWithSettings={sourceManagement.filesWithSettings}
            uploadedFilesCount={fileManagement.files.length}
            maxFilesAllowed={10}
            isFilesLoading={fileManagement.isLoading}
          />
        </FormGroup>
        <FormGroup fieldId="uploaded-files" className="pf-v6-u-mt-md">
          <AlertGroup hasAnimations isToast isLiveRegion>
            {alerts.deleteSuccessAlert}
          </AlertGroup>
          <UploadedFilesList
            files={fileManagement.files}
            isLoading={fileManagement.isLoading}
            isDeleting={fileManagement.isDeleting}
            error={fileManagement.error}
            onDeleteFile={fileManagement.deleteFileById}
          />
        </FormGroup>
      </Form>
    </TabContentWrapper>
  );
};

export default KnowledgeTabContent;
