import React from 'react';
import {
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  ClipboardCopyButton,
} from '@patternfly/react-core';

type CodeBlockComponentProps = {
  children: string;
  /** Called after clipboard write succeeds. */
  onCopy?: () => void;
};

const CodeBlockComponent: React.FC<CodeBlockComponentProps> = ({ children, onCopy }) => {
  const [copied, setCopied] = React.useState(false);
  const id = React.useId();

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      onCopy?.();
    } catch {
      // clipboard write failed — don't show success
    }
  }, [children, onCopy]);

  const actions = (
    <CodeBlockAction>
      <ClipboardCopyButton
        id={`copy-${id}`}
        aria-label="Copy to clipboard"
        onClick={handleCopy}
        onTooltipHidden={() => setCopied(false)}
        exitDelay={copied ? 1500 : 600}
        variant="plain"
      >
        {copied ? 'Successfully copied to clipboard!' : 'Copy to clipboard'}
      </ClipboardCopyButton>
    </CodeBlockAction>
  );

  return (
    <CodeBlock actions={actions}>
      <CodeBlockCode>{children}</CodeBlockCode>
    </CodeBlock>
  );
};

export default CodeBlockComponent;
