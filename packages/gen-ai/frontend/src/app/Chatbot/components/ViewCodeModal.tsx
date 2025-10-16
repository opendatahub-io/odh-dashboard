import * as React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  Spinner,
  Alert,
  AlertVariant,
  Bullseye,
} from '@patternfly/react-core';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { exportCode } from '~/app/services/llamaStackService';
import { CodeExportRequest, FileModel } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';
import { useMCPServers } from '~/app/hooks/useMCPServers';
import { useMCPTokenContext } from '~/app/context/MCPTokenContext';
import { generateMCPServerConfig } from '~/app/utilities';
import { useMCPSelectionContext } from '~/app/context/MCPSelectionContext';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';

interface ViewCodeModalProps {
  isOpen: boolean;
  onToggle: () => void;
  input: string;
  model: string;
  systemInstruction?: string;
  files: FileModel[];
}

const ViewCodeModal: React.FunctionComponent<ViewCodeModalProps> = ({
  isOpen,
  onToggle,
  input,
  model,
  systemInstruction,
  files,
}) => {
  const [code, setCode] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>('');
  const { namespace } = React.useContext(GenAiContext);
  const { servers: mcpServers } = useMCPServers(namespace?.name || '');
  const { serverTokens } = useMCPTokenContext();
  const { playgroundSelectedServerIds } = useMCPSelectionContext();
  const [vectorStores, vectorStoresLoaded] = useFetchVectorStores(namespace?.name);

  const mcpServersToUse = React.useMemo(
    () => mcpServers.filter((server) => playgroundSelectedServerIds.includes(server.url)),
    [mcpServers, playgroundSelectedServerIds],
  );

  const handleExportCode = React.useCallback(async () => {
    setIsLoading(true);
    setError('');
    setCode('');

    if (!namespace?.name) {
      setError('Namespace is required');
      setIsLoading(false);
      return;
    }

    if (!vectorStoresLoaded || vectorStores.length === 0) {
      setError('Vector stores not loaded');
      setIsLoading(false);
      return;
    }

    try {
      /* eslint-disable camelcase */
      const request: CodeExportRequest = {
        input,
        model,
        instructions: systemInstruction,
        stream: false,
        mcp_servers: mcpServersToUse.map((server) => generateMCPServerConfig(server, serverTokens)),
        vector_store: {
          name: vectorStores[0].name,
          // TODO: Get embedding model and dimension from vector store, it's optional
          // embedding_model: 'all-minilm:l6-v2',
          // embedding_dimension: 768,
          provider_id: vectorStores[0].metadata.provider_id,
        },
        files: files.map((file) => ({ file: file.filename, purpose: file.purpose })),
      };
      /* eslint-enable camelcase */

      const response = await exportCode(request, namespace.name);
      setCode(response.data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export code');
    } finally {
      setIsLoading(false);
    }
  }, [
    files,
    input,
    model,
    namespace?.name,
    systemInstruction,
    mcpServersToUse,
    serverTokens,
    vectorStores,
    vectorStoresLoaded,
  ]);

  React.useEffect(() => {
    if (isOpen) {
      handleExportCode();
    }
  }, [isOpen, handleExportCode]);

  return (
    <Modal variant={ModalVariant.large} isOpen={isOpen} onClose={onToggle}>
      <ModalHeader title="View code" />
      <ModalBody>
        {error ? (
          <Alert variant={AlertVariant.danger} title="Error exporting code" isInline>
            {error}
          </Alert>
        ) : isLoading ? (
          <Bullseye>
            <Spinner size="lg" />
          </Bullseye>
        ) : (
          <CodeEditor
            isCopyEnabled
            code={code}
            isLanguageLabelVisible
            language={Language.python}
            height="400px"
            isReadOnly
          />
        )}
      </ModalBody>
    </Modal>
  );
};

export default ViewCodeModal;
