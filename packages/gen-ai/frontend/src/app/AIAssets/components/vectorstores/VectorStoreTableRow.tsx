import * as React from 'react';
import { Button, ButtonVariant, Truncate, Icon, Tooltip } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  OutlinedQuestionCircleIcon,
  PlusCircleIcon,
} from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { TruncatedText } from 'mod-arch-shared';
import {
  AIModel,
  ExternalVectorStoreSummary,
  LlamaModel,
  LlamaStackDistributionModel,
  VectorStore,
} from '~/app/types';
import { computeEmbeddingModelStatus } from '~/app/utilities/utils';
import { GenAiContext } from '~/app/context/GenAiContext';
import { genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import VectorStoreTableRowInfo from './VectorStoreTableRowInfo';

export type { EmbeddingModelStatus } from '~/app/utilities/utils';

interface VectorStoreTableRowProps {
  store: ExternalVectorStoreSummary;
  allModels: AIModel[];
  playgroundModels: LlamaModel[];
  lsdStatus: LlamaStackDistributionModel | null;
  allCollections: ExternalVectorStoreSummary[];
  collectionsLoaded: boolean;
  existingCollections: VectorStore[];
}

const VectorStoreTableRow: React.FC<VectorStoreTableRowProps> = ({
  store,
  allModels,
  playgroundModels,
  lsdStatus,
  allCollections,
  collectionsLoaded,
  existingCollections,
}) => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const [isConfigurationModalOpen, setIsConfigurationModalOpen] = React.useState(false);

  const status = computeEmbeddingModelStatus(store.embedding_model, allModels, playgroundModels);
  const isDisabled = status === 'not_available';
  const isInPlayground = existingCollections.some((vs) => vs.id === store.vector_store_id);

  const dimStyle = isDisabled ? { opacity: 0.5 } : undefined;

  return (
    <>
      <Tr>
        <Td dataLabel="Collection name">
          <div style={dimStyle}>
            <div className="pf-v6-u-font-weight-bold">
              <VectorStoreTableRowInfo store={store} />
            </div>
            {store.description && <TruncatedText maxLines={2} content={store.description} />}
          </div>
        </Td>
        <Td dataLabel="Embedding model">
          {isDisabled && (
            <div
              style={{
                fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--pf-t--global--spacer--xs)',
                marginBottom: 'var(--pf-t--global--spacer--xs)',
              }}
            >
              <Icon status="warning">
                <ExclamationTriangleIcon />
              </Icon>
              Missing model
            </div>
          )}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--pf-t--global--spacer--xs)',
              ...dimStyle,
            }}
          >
            <Truncate content={store.embedding_model} />
            {status === 'registered' && (
              <Icon
                status="success"
                title="Embedding model is registered in the LlamaStack playground"
              >
                <CheckCircleIcon />
              </Icon>
            )}
            {isDisabled && (
              <Tooltip content="Add this embedding model as an AI asset endpoint to use this vector store.">
                <Icon status="warning">
                  <OutlinedQuestionCircleIcon />
                </Icon>
              </Tooltip>
            )}
          </span>
        </Td>
        <Td dataLabel="Dimensions" style={dimStyle}>
          {store.embedding_dimension}
        </Td>
        <Td dataLabel="Playground" style={dimStyle}>
          {isInPlayground ? (
            <Button
              variant={ButtonVariant.secondary}
              onClick={() =>
                navigate(genAiChatPlaygroundRoute(namespace?.name), {
                  state: { vectorStoreId: store.vector_store_id },
                })
              }
            >
              Try in playground
            </Button>
          ) : (
            <Button
              variant={ButtonVariant.link}
              icon={<PlusCircleIcon />}
              isDisabled={isDisabled}
              onClick={() => setIsConfigurationModalOpen(true)}
            >
              Add to playground
            </Button>
          )}
        </Td>
      </Tr>
      {isConfigurationModalOpen && (
        <ChatbotConfigurationModal
          onClose={() => setIsConfigurationModalOpen(false)}
          lsdStatus={lsdStatus}
          aiModels={allModels}
          existingModels={playgroundModels}
          allCollections={allCollections}
          collectionsLoaded={collectionsLoaded}
          existingCollections={existingCollections}
          extraSelectedCollections={[store]}
          initialStepId="collections"
          redirectToPlayground
        />
      )}
    </>
  );
};

export default VectorStoreTableRow;
