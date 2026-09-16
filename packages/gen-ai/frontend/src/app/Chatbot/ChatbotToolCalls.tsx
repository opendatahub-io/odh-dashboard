import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  CodeBlock,
  CodeBlockCode,
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
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
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
              <Label isCompact color={toolCall.category === 'RAG' ? 'blue' : 'purple'}>
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
            <StackItem>
              <Content component="h4">ARGUMENTS</Content>
              <CodeBlock>
                <CodeBlockCode codeClassName="pf-v6-u-text-break-word">
                  {formatJSON(toolCall.arguments, 'No request arguments were provided.')}
                </CodeBlockCode>
              </CodeBlock>
            </StackItem>
            <StackItem>
              <Content component="h4">RESULT</Content>
              <CodeBlock>
                <CodeBlockCode codeClassName="pf-v6-u-text-break-word">
                  {formatJSON(toolCall.output, 'No response was received from the tool.')}
                </CodeBlockCode>
              </CodeBlock>
            </StackItem>
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
    className="pf-v6-u-w-100"
    togglePosition="end"
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
}) => {
  const [uncontrolledIsExpanded, setUncontrolledIsExpanded] = React.useState(false);
  const toggleId = React.useId();
  const contentId = React.useId();
  const status = `${toolCalls.length} tool${toolCalls.length === 1 ? '' : 's'} called`;
  const isExpanded = controlledIsExpanded ?? uncontrolledIsExpanded;
  const toggleExpanded = () => {
    const nextIsExpanded = !isExpanded;
    setUncontrolledIsExpanded(nextIsExpanded);
    onExpandedChange?.(nextIsExpanded);
  };

  if (!isResponseComplete) {
    return (
      <div className="chatbot-tool-calls pf-v6-u-w-100" data-testid="tool-calls">
        <ToolCallList toolCalls={toolCalls} />
      </div>
    );
  }

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
