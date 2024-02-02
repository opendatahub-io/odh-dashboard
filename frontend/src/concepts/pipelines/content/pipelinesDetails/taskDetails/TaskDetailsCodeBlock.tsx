import * as React from 'react';
import {
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
} from '@patternfly/react-core';

type TaskDetailsCodeBlockProps = {
  id: string;
  content: string;
};

const TaskDetailsCodeBlock: React.FC<TaskDetailsCodeBlockProps> = ({ id, content }) => {
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
      actions={
        <React.Fragment>
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
        </React.Fragment>
      }
    >
      <CodeBlockCode id={id}>{content}</CodeBlockCode>
    </CodeBlock>
  );
};

export default TaskDetailsCodeBlock;
