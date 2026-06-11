import {
  Button,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalHeader,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import React from 'react';
import type { OgxCredentials } from '~/app/types';
import type { ResponsesTemplate } from '~/app/types/autoragPattern';
import { formatPatternName } from '~/app/utilities/utils';
import {
  generateCurlSnippet,
  generateGoSnippet,
  generateNodeSnippet,
  generatePythonSnippet,
} from './playgroundSnippets';
import type { SnippetCredentials } from './playgroundSnippets';

type ViewCodeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patternName: string;
  responsesTemplate: ResponsesTemplate;
  ogxCredentials?: OgxCredentials;
};

const snippetTabs = [
  {
    label: 'curl',
    generator: generateCurlSnippet,
    id: 'copy-curl',
    ariaLabel: 'Copy curl snippet',
  },
  {
    label: 'Node.js',
    generator: generateNodeSnippet,
    id: 'copy-nodejs',
    ariaLabel: 'Copy Node.js snippet',
  },
  { label: 'Go', generator: generateGoSnippet, id: 'copy-go', ariaLabel: 'Copy Go snippet' },
  {
    label: 'Python',
    generator: generatePythonSnippet,
    id: 'copy-python',
    ariaLabel: 'Copy Python snippet',
  },
];

const decodeCredentials = (ogxCredentials: OgxCredentials): SnippetCredentials => {
  const decodedBaseUrl = atob(ogxCredentials.baseUrl);
  return {
    hostname: decodedBaseUrl.replace(/^https?:\/\//, ''),
    apiKey: atob(ogxCredentials.apiKey),
  };
};

const ViewCodeModal: React.FC<ViewCodeModalProps> = ({
  isOpen,
  onClose,
  patternName,
  responsesTemplate,
  ogxCredentials,
}) => {
  const [activeCodeTab, setActiveCodeTab] = React.useState(0);
  const [copiedTab, setCopiedTab] = React.useState<number | null>(null);
  const [showCredentials, setShowCredentials] = React.useState(false);

  const hasCredentials = !!ogxCredentials;
  const displayCredentials =
    showCredentials && ogxCredentials ? decodeCredentials(ogxCredentials) : undefined;
  const copyCredentials = ogxCredentials ? decodeCredentials(ogxCredentials) : undefined;

  const handleCopy = React.useCallback((text: string, tabIndex: number) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedTab(tabIndex);
        setTimeout(() => setCopiedTab(null), 2000);
      },
      () => {
        // clipboard access denied
      },
    );
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="large"
      data-testid="playground-view-code-modal"
    >
      <ModalHeader title={`${formatPatternName(patternName)} — Response payload`} />
      <ModalBody className="autorag-view-code-modal__body">
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
          className="pf-v6-u-mb-md"
        >
          <FlexItem>
            <Content component={ContentVariants.p}>
              {hasCredentials ? (
                'Use these code snippets to query this pattern programmatically via the Responses API.'
              ) : (
                <>
                  Use these code snippets to query this pattern programmatically via the Responses
                  API. Replace <code>&lt;HOSTNAME&gt;</code> and <code>&lt;API_KEY&gt;</code> with
                  your OGX instance URL and credentials.
                </>
              )}
            </Content>
          </FlexItem>
          {hasCredentials && (
            <FlexItem>
              <Button
                variant="link"
                icon={showCredentials ? <EyeSlashIcon /> : <EyeIcon />}
                onClick={() => setShowCredentials((prev) => !prev)}
                data-testid="toggle-credentials-button"
              >
                {showCredentials ? 'Hide credentials' : 'Show credentials'}
              </Button>
            </FlexItem>
          )}
        </Flex>
        <Tabs
          activeKey={activeCodeTab}
          onSelect={(_e, key) => setActiveCodeTab(Number(key))}
          data-testid="view-code-tabs"
        >
          {snippetTabs.map((tab, index) => (
            <Tab key={tab.id} eventKey={index} title={<TabTitleText>{tab.label}</TabTitleText>}>
              <CodeBlock
                className="pf-v6-u-mt-md autorag-view-code-modal__code-block"
                actions={
                  <CodeBlockAction>
                    <ClipboardCopyButton
                      id={tab.id}
                      aria-label={tab.ariaLabel}
                      onClick={() =>
                        handleCopy(tab.generator(responsesTemplate, copyCredentials), index)
                      }
                      variant="plain"
                    >
                      {copiedTab === index
                        ? 'Copied'
                        : hasCredentials
                          ? 'Copy with credentials'
                          : 'Copy'}
                    </ClipboardCopyButton>
                  </CodeBlockAction>
                }
              >
                <CodeBlockCode>
                  {tab.generator(responsesTemplate, displayCredentials)}
                </CodeBlockCode>
              </CodeBlock>
            </Tab>
          ))}
        </Tabs>
      </ModalBody>
    </Modal>
  );
};

export default ViewCodeModal;
