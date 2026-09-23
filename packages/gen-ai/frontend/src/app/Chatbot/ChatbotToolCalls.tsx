import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  ClipboardCopyButton,
  Content,
  ExpandableSection,
  ExpandableSectionToggle,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { StreamingToolCall } from '~/app/types';

type ChatbotToolCallsProps = {
  toolCalls: StreamingToolCall[];
  isResponseComplete: boolean;
  isExpanded?: boolean;
  onExpandedChange?: (isExpanded: boolean) => void;
  showToggle?: boolean;
  showContent?: boolean;
  toggleId?: string;
  contentId?: string;
};

const formatDuration = (toolCall: StreamingToolCall): string | undefined => {
  if (toolCall.startedAt === undefined) {
    return undefined;
  }

  const endTime = toolCall.completedAt ?? Date.now();
  return `${((endTime - toolCall.startedAt) / 1000).toFixed(1)}s`;
};

const formatJSON = (value: string | undefined, fallback: string): string => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const ToolCallIcon: React.FC<Pick<StreamingToolCall, 'status'>> = ({ status }) => {
  if (status === 'completed') {
    return <CheckCircleIcon color="var(--pf-t--global--icon--color--status--success--default)" />;
  }
  if (status === 'failed') {
    return (
      <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
    );
  }
  return <Spinner size="sm" aria-label="Tool call in progress" />;
};

type ToolCallCodeBlockProps = {
  heading: string;
  value: string | undefined;
  fallback: string;
  copyButtonId: string;
};

const ToolCallCodeBlock: React.FC<ToolCallCodeBlockProps> = ({
  heading,
  value,
  fallback,
  copyButtonId,
}) => {
  const code = formatJSON(value, fallback);
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard access is not available in every browser context.
    }
  };

  return (
    <StackItem>
      <Content component="h4">{heading}</Content>
      <CodeBlock
        actions={
          <CodeBlockAction>
            <ClipboardCopyButton
              id={copyButtonId}
              aria-label={`Copy ${heading.toLowerCase()} to clipboard`}
              onClick={copyCode}
              variant="plain"
            >
              Copy
            </ClipboardCopyButton>
          </CodeBlockAction>
        }
      >
        <CodeBlockCode codeClassName="pf-v6-u-text-break-word">{code}</CodeBlockCode>
      </CodeBlock>
    </StackItem>
  );
};

const ToolCallRow: React.FC<{ toolCall: StreamingToolCall }> = ({ toolCall }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const contentId = React.useId();
  const toggleId = `tool-call-${toolCall.id}-toggle`;
  const duration = formatDuration(toolCall);
  const label = toolCall.category === 'RAG' ? 'RAG' : (toolCall.serverLabel ?? 'MCP');

  return (
    <AccordionItem isExpanded={isExpanded} data-testid={`tool-call-${toolCall.id}`}>
      <AccordionToggle
        id={toggleId}
        onClick={() => setIsExpanded((previous) => !previous)}
        aria-controls={contentId}
        data-testid={`tool-call-${toolCall.id}-toggle`}
      >
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentFlexStart' }}
          gap={{ default: 'gapSm' }}
          flexWrap={{ default: 'nowrap' }}
        >
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            <FlexItem>
              <ToolCallIcon status={toolCall.status} />
            </FlexItem>
            <FlexItem>
              <span className="pf-v6-u-font-size-sm">{toolCall.name}</span>
            </FlexItem>
            <FlexItem>
              <Label
                isCompact
                variant="outline"
                color={toolCall.category === 'RAG' ? 'orange' : 'blue'}
              >
                {label}
              </Label>
            </FlexItem>
          </Flex>
          {(duration || toolCall.status === 'in_progress') && (
            <FlexItem>
              <Label
                isCompact
                color={toolCall.status === 'failed' ? 'red' : duration ? 'green' : 'grey'}
              >
                {duration ?? 'Running'}
              </Label>
            </FlexItem>
          )}
        </Flex>
      </AccordionToggle>
      {isExpanded && (
        <AccordionContent
          aria-label={`${toolCall.name} details`}
          id={contentId}
          aria-labelledby={toggleId}
        >
          <Stack hasGutter>
            <ToolCallCodeBlock
              heading="Arguments"
              value={toolCall.arguments}
              fallback="No request arguments were provided."
              copyButtonId={`copy-${toolCall.id}-arguments`}
            />
            <ToolCallCodeBlock
              heading="Results"
              value={toolCall.output}
              fallback={toolCall.error ?? 'No response was received from the tool.'}
              copyButtonId={`copy-${toolCall.id}-results`}
            />
          </Stack>
        </AccordionContent>
      )}
    </AccordionItem>
  );
};

const ToolCallList: React.FC<{ toolCalls: StreamingToolCall[] }> = ({ toolCalls }) => (
  <Accordion
    aria-label="Tool calls"
    asDefinitionList={false}
    isBordered
    className="pf-v6-u-w-100"
    togglePosition="start"
  >
    {toolCalls.map((toolCall) => (
      <ToolCallRow key={toolCall.id} toolCall={toolCall} />
    ))}
  </Accordion>
);

const ChatbotToolCalls: React.FC<ChatbotToolCallsProps> = ({
  toolCalls,
  isResponseComplete,
  isExpanded: controlledIsExpanded,
  onExpandedChange,
  showToggle = true,
  showContent = true,
  toggleId: providedToggleId,
  contentId: providedContentId,
}) => {
  const [uncontrolledIsExpanded, setUncontrolledIsExpanded] = React.useState(false);
  const generatedToggleId = React.useId();
  const generatedContentId = React.useId();
  const toggleId = providedToggleId ?? generatedToggleId;
  const contentId = providedContentId ?? generatedContentId;
  const status = `${toolCalls.length} tool${toolCalls.length === 1 ? '' : 's'} called`;
  const toggleExpanded = () => {
    const nextIsExpanded = !isExpanded;
    setUncontrolledIsExpanded(nextIsExpanded);
    onExpandedChange?.(nextIsExpanded);
  };

  const isExpanded = controlledIsExpanded ?? (isResponseComplete ? uncontrolledIsExpanded : true);

  return (
    <div className="chatbot-tool-calls" data-testid="tool-calls">
      {showToggle && (
        <ExpandableSectionToggle
          isExpanded={isExpanded}
          onToggle={toggleExpanded}
          contentId={contentId}
          toggleId={toggleId}
          data-testid="tool-calls-toggle"
        >
          <small>{status}</small>
        </ExpandableSectionToggle>
      )}
      {showContent && (controlledIsExpanded === undefined || isExpanded) && (
        <ExpandableSection
          isExpanded={isExpanded}
          isDetached
          contentId={contentId}
          toggleId={toggleId}
        >
          <ToolCallList toolCalls={toolCalls} />
        </ExpandableSection>
      )}
    </div>
  );
};

export default ChatbotToolCalls;
