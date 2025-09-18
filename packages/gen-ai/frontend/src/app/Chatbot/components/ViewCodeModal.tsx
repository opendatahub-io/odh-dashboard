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
import { CodeExportRequest } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';

interface ViewCodeModalProps {
  isOpen: boolean;
  onToggle: () => void;
  input: string;
  model: string;
  systemInstruction?: string;
}

const ViewCodeModal: React.FunctionComponent<ViewCodeModalProps> = ({
  isOpen,
  onToggle,
  input,
  model,
  systemInstruction,
}) => {
  const [code, setCode] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>('');
  const { namespace } = React.useContext(GenAiContext);

  const handleExportCode = React.useCallback(async () => {
    setIsLoading(true);
    setError('');
    setCode('');

    if (!namespace?.name) {
      setError('Namespace is required');
      setIsLoading(false);
      return;
    }

    try {
      const request: CodeExportRequest = {
        input,
        model,
        instructions: systemInstruction,
        stream: false,
      };

      const response = await exportCode(request, namespace.name);
      setCode(response.data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export code');
    } finally {
      setIsLoading(false);
    }
  }, [input, model, namespace?.name, systemInstruction]);

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

export { ViewCodeModal };

export default ViewCodeModal;
