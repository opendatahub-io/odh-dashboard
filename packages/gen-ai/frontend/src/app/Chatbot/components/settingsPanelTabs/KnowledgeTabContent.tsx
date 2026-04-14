import * as React from 'react';
import {
  Form,
  FormGroup,
  Switch,
  AlertGroup,
  Radio,
  Popover,
  Button,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ChatbotSourceUploadPanel } from '~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
import TabContentWrapper from '~/app/Chatbot/components/settingsPanelTabs/TabContentWrapper';
import UploadedFilesList from '~/app/Chatbot/components/UploadedFilesList';
import {
  useChatbotConfigStore,
  selectRagEnabled,
  selectKnowledgeMode,
  selectSelectedVectorStoreId,
  DEFAULT_CONFIG_ID,
} from '~/app/Chatbot/store';
import { GenAiContext } from '~/app/context/GenAiContext';
import { genAiAiAssetsRoute } from '~/app/utilities/routes';
import useAiAssetVectorStoresEnabled from '~/app/hooks/useAiAssetVectorStoresEnabled';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';

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
  const { namespace } = React.useContext(GenAiContext);

  // Per-pane state from Zustand store
  const isRagEnabled = useChatbotConfigStore(selectRagEnabled(configId));
  const knowledgeMode = useChatbotConfigStore(selectKnowledgeMode(configId));
  const selectedVectorStoreId = useChatbotConfigStore(selectSelectedVectorStoreId(configId));
  const updateRagEnabled = useChatbotConfigStore((state) => state.updateRagEnabled);
  const updateKnowledgeMode = useChatbotConfigStore((state) => state.updateKnowledgeMode);
  const updateSelectedVectorStoreId = useChatbotConfigStore(
    (state) => state.updateSelectedVectorStoreId,
  );

  const isExternalVectorStoresEnabled = useAiAssetVectorStoresEnabled();

  // Always call the hook (rules of hooks), but the result is only used when flag is ON + external mode
  const [allVectorStores, vectorStoresLoaded] = useFetchVectorStores();
  const externalVectorStores = React.useMemo(
    () => allVectorStores.filter((vs) => vs.metadata.created_by !== 'auto-provisioning'),
    [allVectorStores],
  );

  const [isSelectOpen, setIsSelectOpen] = React.useState(false);

  // Auto-enable RAG when a file is successfully uploaded via inline mode.
  // External vector store selection enables RAG directly in the onSelect handler below.
  const { autoEnableRag, setAutoEnableRag } = sourceManagement;
  React.useEffect(() => {
    if (autoEnableRag) {
      updateRagEnabled(configId, true);
      setAutoEnableRag(false);
    }
  }, [autoEnableRag, setAutoEnableRag, updateRagEnabled, configId]);

  const selectedStoreName = React.useMemo(
    () => externalVectorStores.find((s) => s.id === selectedVectorStoreId)?.name,
    [selectedVectorStoreId, externalVectorStores],
  );

  // --- Upload fields (shared between flag-off and flag-on upload mode) ---
  const uploadFields = (
    <>
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
    </>
  );

  // --- Feature flag OFF: existing UI ---
  if (!isExternalVectorStoresEnabled) {
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
        <Form>{uploadFields}</Form>
      </TabContentWrapper>
    );
  }

  // --- External vector store content ---
  let externalContent: React.ReactNode;
  if (!vectorStoresLoaded) {
    externalContent = (
      <Spinner
        size="md"
        aria-label="Loading vector stores"
        data-testid="vector-stores-loading-spinner"
      />
    );
  } else if (externalVectorStores.length === 0) {
    externalContent = (
      <EmptyState
        headingLevel="h4"
        titleText="No collections configured"
        data-testid="no-vector-stores-empty-state"
      >
        <EmptyStateBody>
          To use a vector store, go to AI asset endpoints and add a collection to the playground.
        </EmptyStateBody>
        <EmptyStateFooter>
          <Button
            variant="link"
            component={(props) => <Link {...props} to={genAiAiAssetsRoute(namespace?.name)} />}
            data-testid="go-to-ai-asset-endpoints-link"
          >
            Go to AI asset endpoints
          </Button>
        </EmptyStateFooter>
      </EmptyState>
    );
  } else {
    externalContent = (
      <Select
        id="external-vector-store-select"
        isOpen={isSelectOpen}
        selected={selectedVectorStoreId ?? undefined}
        onSelect={(_, value) => {
          updateSelectedVectorStoreId(configId, String(value));
          updateRagEnabled(configId, true);
          setIsSelectOpen(false);
        }}
        onOpenChange={(open) => setIsSelectOpen(open)}
        toggle={(ref) => (
          <MenuToggle
            ref={ref}
            onClick={() => setIsSelectOpen(!isSelectOpen)}
            isExpanded={isSelectOpen}
            isFullWidth
            data-testid="external-vector-store-toggle"
          >
            {selectedStoreName ?? 'Select a vector store'}
          </MenuToggle>
        )}
        aria-label="Select a vector store"
        data-testid="external-vector-store-select"
      >
        <SelectList>
          {externalVectorStores.map((store) => (
            <SelectOption
              key={store.id}
              value={store.id}
              description={store.metadata.description}
              data-testid={`vector-store-option-${store.id}`}
            >
              {store.name}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    );
  }

  // --- Feature flag ON: radio mode selector ---
  const uploadLabel = (
    <>
      Use uploaded documents{' '}
      <Popover
        bodyContent="Upload and use your own files as grounding knowledge. Files are chunked, embedded, and stored in a playground-local database."
        aria-label="Use uploaded documents info"
      >
        <Button
          variant="plain"
          aria-label="More info for Use uploaded documents"
          style={{ padding: 0, verticalAlign: 'middle' }}
        >
          <OutlinedQuestionCircleIcon />
        </Button>
      </Popover>
    </>
  );

  const externalLabel = (
    <>
      Use an existing vector store{' '}
      <Popover
        bodyContent="Connect to a registered external vector store collection to provide the model with custom knowledge and context."
        aria-label="Use an existing vector store info"
      >
        <Button
          variant="plain"
          aria-label="More info for Use an existing vector store"
          style={{ padding: 0, verticalAlign: 'middle' }}
        >
          <OutlinedQuestionCircleIcon />
        </Button>
      </Popover>
    </>
  );

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
    <TabContentWrapper
      title="Knowledge"
      headerActions={headerActions}
      titleTestId="knowledge-section-title"
    >
      <Form>
        <FormGroup fieldId="knowledge-mode" role="radiogroup" aria-label="Knowledge source">
          <Radio
            id="knowledge-mode-upload"
            name="knowledge-mode"
            label={uploadLabel}
            isChecked={knowledgeMode === 'inline'}
            onChange={() => updateKnowledgeMode(configId, 'inline')}
            data-testid="knowledge-mode-upload-radio"
          />
          <Radio
            id="knowledge-mode-external"
            name="knowledge-mode"
            label={externalLabel}
            isChecked={knowledgeMode === 'external'}
            onChange={() => updateKnowledgeMode(configId, 'external')}
            data-testid="knowledge-mode-external-radio"
          />
        </FormGroup>
        {knowledgeMode === 'inline' ? (
          uploadFields
        ) : (
          <FormGroup fieldId="knowledge-external-store">{externalContent}</FormGroup>
        )}
      </Form>
    </TabContentWrapper>
  );
};

export default KnowledgeTabContent;
