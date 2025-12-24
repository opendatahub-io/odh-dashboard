import * as React from 'react';
import {
  capitalize,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  Flex,
  Popover,
  Title,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';

type FeatureStoreCodeBlockProps = {
  id: string;
  content: string;
  testId?: string;
  className?: string;
  lang?: string;
  featureStoreType?: string;
};

const FeatureStoreCodeBlock: React.FC<FeatureStoreCodeBlockProps> = ({
  id,
  content,
  testId,
  className,
  lang = 'python',
  featureStoreType,
}) => {
  const [copied, setCopied] = React.useState(false);
  const displayType = featureStoreType ? capitalize(featureStoreType) : 'Resource';

  const clipboardCopyFunc = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const onClick = (text: string) => {
    clipboardCopyFunc(text);
    setCopied(true);
  };

  return (
    <>
      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
        <Title headingLevel="h3" data-testid="definition-title" style={{ margin: '1em 0' }}>
          {displayType} definition
        </Title>
        <Popover
          maxWidth="400px"
          headerContent={`How to use this ${featureStoreType ?? 'resource'} definition?`}
          bodyContent={`This code shows the definition used to create the ${id} ${
            featureStoreType ?? 'resource'
          }. You can copy and modify it to define similar resources in code.`}
        >
          <DashboardPopupIconButton icon={<OutlinedQuestionCircleIcon />} />
        </Popover>
      </Flex>
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
    </>
  );
};

export default FeatureStoreCodeBlock;
