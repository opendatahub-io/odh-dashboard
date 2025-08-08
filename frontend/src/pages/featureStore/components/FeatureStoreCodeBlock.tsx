import * as React from 'react';
import {
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
} from '@patternfly/react-core';

type FeatureStoreCodeBlockProps = {
  id: string;
  content: string;
  testId?: string;
  className?: string;
  lang?: string;
};

const FeatureStoreCodeBlock: React.FC<FeatureStoreCodeBlockProps> = ({
  id,
  content,
  testId,
  className,
  lang = 'python',
}) => {
  const [copied, setCopied] = React.useState(false);

  const clipboardCopyFunc = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const onClick = (text: string) => {
    clipboardCopyFunc(text);
    setCopied(true);
  };

  return (
    <CodeBlock
      lang={lang}
      data-testid={testId}
      className={className}
      actions={
        <CodeBlockAction>
          <ClipboardCopyButton
            id={`${id}-button`}
            textId={id}
            aria-label="Copy to clipboard"
            onClick={() => onClick(content)}
            exitDelay={copied ? 1500 : 600}
            maxWidth="110px"
            variant="plain"
            onTooltipHidden={() => setCopied(false)}
          >
            {copied ? 'Successfully copied to clipboard!' : 'Copy to clipboard'}
          </ClipboardCopyButton>
        </CodeBlockAction>
      }
    >
      <CodeBlockCode id={id}>{content}</CodeBlockCode>
    </CodeBlock>
  );
};

export default FeatureStoreCodeBlock;
