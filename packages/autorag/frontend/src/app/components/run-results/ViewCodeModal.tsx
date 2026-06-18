import {
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  Content,
  ContentVariants,
  Modal,
  ModalBody,
  ModalHeader,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import React from 'react';
import { useParams } from 'react-router';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import type { ResponsesTemplate } from '~/app/types/autoragPattern';
import { formatPatternName } from '~/app/utilities/utils';
import {
  generateCurlSnippet,
  generateGoSnippet,
  generateNodeSnippet,
  generatePythonSnippet,
} from './playgroundSnippets';

type ViewCodeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patternName: string;
  responsesTemplate: ResponsesTemplate;
};

const ViewCodeModal: React.FC<ViewCodeModalProps> = ({
  isOpen,
  onClose,
  patternName,
  responsesTemplate,
}) => {
  const { namespace } = useParams();
  const { parameters } = useAutoragResultsContext();
  const secretName = parameters?.ogx_secret_name ?? '';

  const snippetParams = React.useMemo(
    () => ({ template: responsesTemplate, secretName, namespace: namespace ?? '' }),
    [responsesTemplate, secretName, namespace],
  );

  const [activeCodeTab, setActiveCodeTab] = React.useState(0);
  const [copiedTab, setCopiedTab] = React.useState<number | null>(null);

  const handleCopy = React.useCallback((text: string, tabIndex: number) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedTab(tabIndex);
        setTimeout(() => setCopiedTab(null), 2000);
      },
      () => {
        // clipboard access denied — don't show Copied feedback
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
        <Content component={ContentVariants.p} className="pf-v6-u-mb-md">
          Use these code snippets to query this pattern programmatically via the Responses API. Each
          snippet automatically fetches the credentials from the secret{' '}
          <strong>{secretName}</strong> in namespace <strong>{namespace}</strong>.
        </Content>
        <Tabs
          activeKey={activeCodeTab}
          onSelect={(_e, key) => setActiveCodeTab(Number(key))}
          data-testid="view-code-tabs"
        >
          <Tab eventKey={0} title={<TabTitleText>curl</TabTitleText>}>
            <CodeBlock
              className="pf-v6-u-mt-md autorag-view-code-modal__code-block"
              actions={
                <CodeBlockAction>
                  <ClipboardCopyButton
                    id="copy-curl"
                    aria-label="Copy curl snippet"
                    onClick={() => handleCopy(generateCurlSnippet(snippetParams), 0)}
                    variant="plain"
                  >
                    {copiedTab === 0 ? 'Copied' : 'Copy'}
                  </ClipboardCopyButton>
                </CodeBlockAction>
              }
            >
              <CodeBlockCode>{generateCurlSnippet(snippetParams)}</CodeBlockCode>
            </CodeBlock>
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Go</TabTitleText>}>
            <CodeBlock
              className="pf-v6-u-mt-md autorag-view-code-modal__code-block"
              actions={
                <CodeBlockAction>
                  <ClipboardCopyButton
                    id="copy-go"
                    aria-label="Copy Go snippet"
                    onClick={() => handleCopy(generateGoSnippet(snippetParams), 1)}
                    variant="plain"
                  >
                    {copiedTab === 1 ? 'Copied' : 'Copy'}
                  </ClipboardCopyButton>
                </CodeBlockAction>
              }
            >
              <CodeBlockCode>{generateGoSnippet(snippetParams)}</CodeBlockCode>
            </CodeBlock>
          </Tab>
          <Tab eventKey={2} title={<TabTitleText>Node.js</TabTitleText>}>
            <CodeBlock
              className="pf-v6-u-mt-md autorag-view-code-modal__code-block"
              actions={
                <CodeBlockAction>
                  <ClipboardCopyButton
                    id="copy-nodejs"
                    aria-label="Copy Node.js snippet"
                    onClick={() => handleCopy(generateNodeSnippet(snippetParams), 2)}
                    variant="plain"
                  >
                    {copiedTab === 2 ? 'Copied' : 'Copy'}
                  </ClipboardCopyButton>
                </CodeBlockAction>
              }
            >
              <CodeBlockCode>{generateNodeSnippet(snippetParams)}</CodeBlockCode>
            </CodeBlock>
          </Tab>
          <Tab eventKey={3} title={<TabTitleText>Python</TabTitleText>}>
            <CodeBlock
              className="pf-v6-u-mt-md autorag-view-code-modal__code-block"
              actions={
                <CodeBlockAction>
                  <ClipboardCopyButton
                    id="copy-python"
                    aria-label="Copy Python snippet"
                    onClick={() => handleCopy(generatePythonSnippet(snippetParams), 3)}
                    variant="plain"
                  >
                    {copiedTab === 3 ? 'Copied' : 'Copy'}
                  </ClipboardCopyButton>
                </CodeBlockAction>
              }
            >
              <CodeBlockCode>{generatePythonSnippet(snippetParams)}</CodeBlockCode>
            </CodeBlock>
          </Tab>
        </Tabs>
      </ModalBody>
    </Modal>
  );
};

export default ViewCodeModal;
