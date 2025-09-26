import * as React from 'react';
import {
  Button,
  CodeBlock,
  CodeBlockCode,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { CopyIcon, WrenchIcon } from '@patternfly/react-icons';

type CSSCustomProperties = {
  [key: `--${string}`]: string | number;
};

type ExtendedCSSProperties = React.CSSProperties & CSSCustomProperties;

interface ToolResponseCardTitleProps {
  toolName: string;
}

interface ToolResponseCardBodyProps {
  toolArguments?: string;
  toolOutput?: string;
}

export const ToolResponseCardTitle: React.FC<ToolResponseCardTitleProps> = ({ toolName }) => {
  const handleCopyToolName = async () => {
    try {
      await navigator.clipboard.writeText(toolName);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = toolName;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
    >
      <FlexItem>
        <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
          <FlexItem grow={{ default: 'grow' }}>
            <Flex gap={{ default: 'gapSm' }}>
              <FlexItem>
                <WrenchIcon style={{ color: 'var(--pf-t--global--icon--color--brand--default)' }} />
              </FlexItem>
              <FlexItem>{toolName}</FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </FlexItem>
      <FlexItem>
        <Button
          variant="plain"
          aria-label="Copy tool name to clipboard"
          icon={<CopyIcon style={{ color: 'var(--pf-t--global--icon--color--subtle)' }} />}
          onClick={handleCopyToolName}
        />
      </FlexItem>
    </Flex>
  );
};

export const ToolResponseCardBody: React.FC<ToolResponseCardBodyProps> = ({
  toolArguments,
  toolOutput,
}) => {
  const descriptionListStyle: ExtendedCSSProperties = {
    '--pf-v6-c-description-list--RowGap': 'var(--pf-t--global--spacer--md)',
  };

  const descriptionListGroupStyle: ExtendedCSSProperties = {
    '--pf-v6-c-description-list__group--RowGap': 'var(--pf-t--global--spacer--xs)',
  };

  return (
    <>
      <DescriptionList style={descriptionListStyle} aria-label="Tool response">
        <DescriptionListGroup style={descriptionListGroupStyle}>
          <DescriptionListTerm>Arguments</DescriptionListTerm>
          <DescriptionListDescription>
            <CodeBlock>
              <CodeBlockCode>
                {(() => {
                  const argumentsText =
                    typeof toolArguments === 'string' && toolArguments.length > 0
                      ? toolArguments
                      : 'No arguments provided.';
                  try {
                    const parsedArgs = JSON.parse(argumentsText);
                    return JSON.stringify(parsedArgs, null, 2);
                  } catch {
                    return argumentsText;
                  }
                })()}
              </CodeBlockCode>
            </CodeBlock>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup style={descriptionListGroupStyle}>
          <DescriptionListTerm>Response</DescriptionListTerm>
          <DescriptionListDescription>
            <CodeBlock>
              <CodeBlockCode>
                {(() => {
                  const responseText =
                    toolOutput && typeof toolOutput === 'string'
                      ? toolOutput
                      : 'No response received from tool.';

                  try {
                    const parsedResponse = JSON.parse(responseText);
                    return JSON.stringify(parsedResponse, null, 2);
                  } catch {
                    return responseText;
                  }
                })()}
              </CodeBlockCode>
            </CodeBlock>
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </>
  );
};
