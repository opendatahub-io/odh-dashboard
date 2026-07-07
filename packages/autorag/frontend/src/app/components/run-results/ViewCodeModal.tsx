import {
  Alert,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  Content,
  ContentVariants,
  Modal,
  ModalBody,
  ModalHeader,
  Switch,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import React from 'react';
import { useParams } from 'react-router';
import type { OgxCredentials } from '~/app/types';
import type { ResponsesTemplate } from '~/app/types/autoragPattern';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import { useNotification } from '~/app/hooks/useNotification';
import { formatPatternName } from '~/app/utilities/utils';
import {
  generateCurlSnippet,
  generateGoSnippet,
  generateNodeSnippet,
  generatePythonSnippet,
} from './playgroundSnippets';
import type { SnippetCredentials, SnippetParams } from './playgroundSnippets';

type ViewCodeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patternName: string;
  responsesTemplate: ResponsesTemplate;
  ogxCredentials?: OgxCredentials;
};

const snippetTabs: {
  label: string;
  generator: (params: SnippetParams, credentials?: SnippetCredentials) => string;
  id: string;
  ariaLabel: string;
}[] = [
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
    hostname: decodedBaseUrl.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
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
  const { namespace } = useParams();
  const { parameters } = useAutoragResultsContext();
  const secretName = parameters?.ogx_secret_name ?? '';

  const snippetParams: SnippetParams = React.useMemo(
    () => ({ template: responsesTemplate, secretName, namespace: namespace ?? '' }),
    [responsesTemplate, secretName, namespace],
  );

  const [activeCodeTab, setActiveCodeTab] = React.useState(0);
  const [copiedTab, setCopiedTab] = React.useState<number | null>(null);
  const [showCredentials, setShowCredentials] = React.useState(false);
  const notification = useNotification();

  const decodedCredentials = React.useMemo(() => {
    if (!ogxCredentials) {
      return undefined;
    }
    try {
      return decodeCredentials(ogxCredentials);
    } catch {
      return undefined;
    }
  }, [ogxCredentials]);

  React.useEffect(() => {
    if (ogxCredentials && !decodedCredentials) {
      notification.error(
        'Failed to decode credentials',
        'The secret data could not be decoded. Credential placeholders will be shown instead.',
      );
    }
  }, [ogxCredentials, decodedCredentials, notification]);

  const hasCredentials = !!decodedCredentials;
  const displayCredentials = showCredentials ? decodedCredentials : undefined;

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
        <Content component={ContentVariants.p} className="pf-v6-u-mb-md">
          {hasCredentials
            ? 'Use these code snippets to query this pattern programmatically via the Responses API.'
            : 'Use these code snippets to query this pattern programmatically via the Responses API. Each snippet fetches your Open GenAI Stack credentials from the cluster automatically.'}
        </Content>
        {hasCredentials && (
          <div
            className={`autorag-view-code-modal__credentials-alert${showCredentials ? ' autorag-view-code-modal__credentials-alert--visible' : ''}`}
            aria-hidden={!showCredentials}
          >
            <Alert
              variant="warning"
              isInline
              title="Credentials will be included when you copy"
              data-testid="credentials-warning-alert"
            >
              Your real Open GenAI Stack hostname and API key will be copied with the snippet. Treat
              the copied code as a secret.
            </Alert>
          </div>
        )}
        <div className="autorag-view-code-modal__tabs-container">
          {hasCredentials && (
            <div className="autorag-view-code-modal__credentials-toggle">
              <Switch
                label="Inject credentials"
                isChecked={showCredentials}
                onChange={(_e, checked) => setShowCredentials(checked)}
                data-testid="toggle-credentials-button"
              />
            </div>
          )}
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
                        aria-label={
                          showCredentials && hasCredentials
                            ? `${tab.ariaLabel} with credentials`
                            : tab.ariaLabel
                        }
                        onClick={() =>
                          handleCopy(tab.generator(snippetParams, displayCredentials), index)
                        }
                        variant="plain"
                      >
                        {copiedTab === index
                          ? 'Copied'
                          : showCredentials && hasCredentials
                            ? 'Copy with credentials'
                            : 'Copy'}
                      </ClipboardCopyButton>
                    </CodeBlockAction>
                  }
                >
                  <CodeBlockCode>{tab.generator(snippetParams, displayCredentials)}</CodeBlockCode>
                </CodeBlock>
              </Tab>
            ))}
          </Tabs>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default ViewCodeModal;
