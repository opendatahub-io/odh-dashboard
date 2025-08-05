import * as React from 'react';

export interface UseSystemInstructionsReturn {
  systemInstructions: string;
  isSystemInstructionsReadOnly: boolean;
  onSystemInstructionsChange: (instructions: string) => void;
  onEditSystemInstructions: () => void;
  onSaveSystemInstructions: () => void;
  onCancelSystemInstructions: () => void;
}

const useSystemInstructions = (): UseSystemInstructionsReturn => {
  const [systemInstructions, setSystemInstructions] = React.useState('');
  const [isSystemInstructionsReadOnly, setIsSystemInstructionsReadOnly] = React.useState(true);
  const [originalSystemInstructions, setOriginalSystemInstructions] =
    React.useState(systemInstructions);

  const onSystemInstructionsChange = React.useCallback((instructions: string) => {
    setSystemInstructions(instructions);
  }, []);

  const onEditSystemInstructions = React.useCallback(() => {
    setOriginalSystemInstructions(systemInstructions);
    setIsSystemInstructionsReadOnly(false);
  }, [systemInstructions]);

  const onSaveSystemInstructions = React.useCallback(() => {
    setIsSystemInstructionsReadOnly(true);
    // TODO: Implement actual save logic
  }, []);

  const onCancelSystemInstructions = React.useCallback(() => {
    setSystemInstructions(originalSystemInstructions);
    setIsSystemInstructionsReadOnly(true);
  }, [originalSystemInstructions]);

  return {
    systemInstructions,
    isSystemInstructionsReadOnly,
    onSystemInstructionsChange,
    onEditSystemInstructions,
    onSaveSystemInstructions,
    onCancelSystemInstructions,
  };
};

export default useSystemInstructions;
