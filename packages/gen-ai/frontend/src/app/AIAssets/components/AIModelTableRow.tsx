import * as React from 'react';
import {
  Alert,
  Button,
  Truncate,
  Label,
  ButtonVariant,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import {
  InfoCircleIcon,
  OutlinedQuestionCircleIcon,
  PlusCircleIcon,
  EllipsisVIcon,
} from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { TableRowTitleDescription, TruncatedText } from 'mod-arch-shared';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  AIModel,
  ExternalVectorStoreSummary,
  LlamaModel,
  LlamaStackDistributionModel,
  VectorStore,
} from '~/app/types';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import { genAiAiAssetsTabRoute, genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import { isPlaygroundModelMatchForAIModel } from '~/app/utilities/utils';
import useAiAssetVectorStoresEnabled from '~/app/hooks/useAiAssetVectorStoresEnabled';
import { GenAiContext } from '~/app/context/GenAiContext';
import AIModelsTableRowInfo from './AIModelsTableRowInfo';
import EndpointDetailModal from './EndpointDetailModal';

type AIModelTableRowProps = {
  lsdStatus: LlamaStackDistributionModel | null;
  model: AIModel;
  allModels: AIModel[];
  playgroundModels: LlamaModel[];
  onDelete?: (modelId: string) => Promise<void>;
  showActionColumn?: boolean;
  allCollections: ExternalVectorStoreSummary[];
  collectionsLoaded: boolean;
  existingCollections: VectorStore[];
};

const AIModelTableRow: React.FC<AIModelTableRowProps> = ({
  lsdStatus,
  model,
  allModels,
  playgroundModels,
  onDelete,
  showActionColumn = false,
  allCollections,
  collectionsLoaded,
  existingCollections,
}) => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const isVectorStoresEnabled = useAiAssetVectorStoresEnabled();
  const enabledModel = playgroundModels.find((m) => isPlaygroundModelMatchForAIModel(m, model));
  const [isConfigurationModalOpen, setIsConfigurationModalOpen] = React.useState(false);
  const [isEndpointModalOpen, setIsEndpointModalOpen] = React.useState(false);
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const assetType = model.model_source_type === 'maas' ? 'maas_model' : 'model';

  const handleDelete = React.useCallback(async () => {
    if (!onDelete) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(model.model_id);
      setIsDeleteModalOpen(false);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Failed to remove asset. Please try again.',
      );
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, model.model_id]);

  return (
    <>
      <Tr>
        <Td dataLabel="Model">
          <TableRowTitleDescription title={<AIModelsTableRowInfo model={model} />} />
          <Truncate
            content={model.model_id}
            className="pf-v6-u-font-family-monospace pf-v6-u-font-size-xs pf-v6-u-color-200 pf-v6-u-mt-xs"
          />
          {model.description && (
            <Truncate
              content={model.description}
              className="pf-v6-u-font-size-xs pf-v6-u-color-200 pf-v6-u-mt-sm"
              style={{ cursor: 'help' }}
            />
          )}
        </Td>
        <Td dataLabel="Use case">
          <TruncatedText maxLines={2} content={model.usecase} />
        </Td>
        <Td dataLabel="Status">
          {(() => {
            switch (model.status) {
              case 'Running':
                return (
                  <Label status="success" variant="outline">
                    Ready
                  </Label>
                );
              case 'Stop':
                return (
                  <Label status="danger" variant="outline">
                    Inactive
                  </Label>
                );
              default:
                return (
                  <Label variant="outline" color="grey" icon={<OutlinedQuestionCircleIcon />}>
                    Unknown
                  </Label>
                );
            }
          })()}
        </Td>
        <Td dataLabel="Endpoints">
          {model.externalEndpoint || model.internalEndpoint ? (
            <Button
              data-testid="endpoint-view-button"
              variant={ButtonVariant.link}
              onClick={() => {
                fireMiscTrackingEvent('Available Endpoints Endpoint Viewed', {
                  modelType: model.model_type === 'embedding' ? 'embedding' : 'inference',
                  endpointSource: model.model_source_type,
                });
                setIsEndpointModalOpen(true);
              }}
            >
              View
            </Button>
          ) : (
            <Label
              icon={<InfoCircleIcon />}
              data-testid="endpoint-not-available"
              aria-label="Endpoint not available"
            >
              Not available
            </Label>
          )}
        </Td>
        <Td dataLabel="Playground">
          {enabledModel ? (
            <>
              {model.model_type === 'embedding' && isVectorStoresEnabled ? (
                <Button
                  data-testid="see-vector-stores-button"
                  variant={ButtonVariant.link}
                  onClick={() => {
                    fireMiscTrackingEvent('Available Endpoints See Vector Stores Clicked', {
                      modelId: model.model_id,
                    });
                    if (namespace?.name) {
                      navigate(genAiAiAssetsTabRoute(namespace.name, 'vectorstores'));
                    }
                  }}
                >
                  See vector stores
                </Button>
              ) : (
                <Button
                  data-testid="try-playground-button"
                  variant={ButtonVariant.secondary}
                  onClick={() => {
                    fireMiscTrackingEvent('Available Endpoints Playground Launched', {
                      assetType,
                      assetId: model.model_id,
                    });
                    navigate(genAiChatPlaygroundRoute(namespace?.name), {
                      state: {
                        model: enabledModel.id,
                      },
                    });
                  }}
                  // Embedding models cannot be tried in the chat playground (vector output is not supported)
                  // Custom endpoint models are always available if they're in the list
                  isDisabled={
                    model.model_type === 'embedding' ||
                    (model.model_source_type !== 'custom_endpoint' && model.status !== 'Running')
                  }
                >
                  Try in playground
                </Button>
              )}
            </>
          ) : (
            <Button
              variant={ButtonVariant.link}
              icon={<PlusCircleIcon />}
              onClick={() => setIsConfigurationModalOpen(true)}
              // Add stays enabled for embedding models (may be used in RAG configurations)
              // Custom endpoint models are always available if they're in the list
              isDisabled={
                model.model_source_type !== 'custom_endpoint' && model.status !== 'Running'
              }
            >
              Add to playground
            </Button>
          )}
        </Td>
        {showActionColumn && (
          <Td isActionCell>
            {model.model_source_type === 'custom_endpoint' && onDelete && (
              <Dropdown
                isOpen={isKebabOpen}
                onOpenChange={(isOpen) => setIsKebabOpen(isOpen)}
                popperProps={{ position: 'end', preventOverflow: true }}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    aria-label={`Actions for ${model.display_name || model.model_id}`}
                    variant="plain"
                    onClick={() => setIsKebabOpen(!isKebabOpen)}
                    data-testid="model-actions-kebab"
                  >
                    <EllipsisVIcon />
                  </MenuToggle>
                )}
              >
                <DropdownList data-testid="model-actions-dropdown-menu">
                  <DropdownItem
                    key="delete"
                    data-testid="remove-asset-action"
                    onClick={() => {
                      setIsKebabOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    isDanger
                  >
                    Remove asset
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            )}
          </Td>
        )}
      </Tr>
      {isEndpointModalOpen && (
        <EndpointDetailModal model={model} onClose={() => setIsEndpointModalOpen(false)} />
      )}
      {isConfigurationModalOpen && (
        <ChatbotConfigurationModal
          onClose={() => setIsConfigurationModalOpen(false)}
          lsdStatus={lsdStatus}
          aiModels={allModels}
          existingModels={playgroundModels}
          extraSelectedModels={[model]}
          redirectToPlayground
          allCollections={allCollections}
          collectionsLoaded={collectionsLoaded}
          existingCollections={existingCollections}
        />
      )}
      {isDeleteModalOpen && (
        <Modal
          variant="small"
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteError(null);
          }}
          data-testid="delete-model-modal"
        >
          <ModalHeader title="Remove asset?" />
          <ModalBody>
            {deleteError && (
              <Alert
                variant="danger"
                isInline
                title="Error"
                data-testid="delete-model-error-alert"
                style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
              >
                {deleteError}
              </Alert>
            )}
            <strong>{model.display_name}</strong> will be removed from this project&apos;s endpoints
            list. The endpoint configuration will be deleted.
          </ModalBody>
          <ModalFooter>
            <Button
              key="confirm"
              variant="danger"
              onClick={handleDelete}
              isDisabled={isDeleting}
              isLoading={isDeleting}
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </Button>
            <Button
              key="cancel"
              variant="link"
              onClick={() => setIsDeleteModalOpen(false)}
              isDisabled={isDeleting}
            >
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};

export default AIModelTableRow;
