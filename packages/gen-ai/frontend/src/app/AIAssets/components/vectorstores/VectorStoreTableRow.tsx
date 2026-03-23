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
import { AIModel, ExternalVectorStoreSummary, LlamaModel } from '~/app/types';
import { splitLlamaModelId } from '~/app/utilities/utils';
import { GenAiContext } from '~/app/context/GenAiContext';
import { genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import VectorStoreTableRowInfo from './VectorStoreTableRowInfo';

export type EmbeddingModelStatus = 'not_available' | 'available' | 'registered';

export const computeEmbeddingModelStatus = (
  embeddingModel: string,
  allModels: AIModel[],
  playgroundModels: LlamaModel[],
): EmbeddingModelStatus => {
  const { id: normalizedId } = splitLlamaModelId(embeddingModel);

  // "registered": embedding model is in the LlamaStack playground.
  // playgroundModels[].modelId is already normalized via splitLlamaModelId.
  const isRegistered = playgroundModels.some(
    (m) => m.modelId === embeddingModel || m.modelId === normalizedId,
  );
  if (isRegistered) {
    return 'registered';
  }

  // "available": embedding model exists in the unified AI Assets models list (AAE + MaaS).
  // Normalize both sides to handle provider-prefixed vs plain IDs.
  const isAvailable = allModels.some((m) => {
    const { id: normalizedModelId } = splitLlamaModelId(m.model_id);
    return m.model_id === embeddingModel || normalizedModelId === normalizedId;
  });
  if (isAvailable) {
    return 'available';
  }

  return 'not_available';
};

interface VectorStoreTableRowProps {
  store: ExternalVectorStoreSummary;
  allModels: AIModel[];
  playgroundModels: LlamaModel[];
}

const VectorStoreTableRow: React.FC<VectorStoreTableRowProps> = ({
  store,
  allModels,
  playgroundModels,
}) => {
  const navigate = useNavigate();
  const { namespace } = React.useContext(GenAiContext);
  const status = computeEmbeddingModelStatus(store.embedding_model, allModels, playgroundModels);
  const isDisabled = status === 'not_available';

  const dimStyle = isDisabled ? { opacity: 0.5 } : undefined;

  return (
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
        {status === 'registered' ? (
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
          // TODO: hook up "Add to playground" action in a follow-up PR
          <Button variant={ButtonVariant.link} icon={<PlusCircleIcon />} isDisabled>
            Add to playground
          </Button>
        )}
      </Td>
    </Tr>
  );
};

export default VectorStoreTableRow;
