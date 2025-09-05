/* eslint-disable camelcase */
import * as React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  Spinner,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import { exportCode } from '~/app/services/llamaStackService';
import { CodeExportRequest } from '~/app/types';

interface ViewCodeModalProps {
  isOpen: boolean;
  onToggle: () => void;
  input?: string;
  model?: string;
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

  const isDisabled = !input || !model;

  const handleExportCode = React.useCallback(async () => {
    if (!input || !model) {
      return;
    }

    setIsLoading(true);
    setError('');
    setCode('');

    try {
      const request: CodeExportRequest = {
        input,
        model,
        instructions: systemInstruction,
        stream: false,
      };

      const response = await exportCode(request);
      setCode(response.data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export code');
    } finally {
      setIsLoading(false);
    }
  }, [input, model, systemInstruction]);

  React.useEffect(() => {
    if (isOpen && !isDisabled) {
      handleExportCode();
    }
  }, [isOpen, isDisabled, handleExportCode]);

  return (
    <Modal
      variant={ModalVariant.large}
      title="Generated Python Code"
      isOpen={isOpen}
      onClose={onToggle}
    >
      <ModalHeader title="View code" />
      <ModalBody>
        {error ? (
          <Alert variant={AlertVariant.danger} title="Error exporting code" isInline>
            {error}
          </Alert>
        ) : isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Spinner size="lg" />
            <div style={{ marginTop: '1rem' }}>Generating code...</div>
          </div>
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
