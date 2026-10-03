import {
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  Content,
  ContentVariants,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Modal,
  ModalBody,
  ModalHeader,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { useParams } from 'react-router';
import type { ResponsesTemplate } from '~/app/types/autoragPattern';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import { fireAutoragCodeSnippetsExported } from '~/app/utilities/tracking';
import { formatPatternName } from '~/app/utilities/utils';
import { resolveDatabaseSecretName, resolveMaaSSecretName } from '~/app/utilities/responses';
import {
  generateCurlSnippet,
  generateGoSnippet,
  generateNodeSnippet,
  generatePythonSnippet,
} from './playgroundSnippets';
import type { SnippetParams } from './playgroundSnippets';

type ViewCodeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patternName: string;
  responsesTemplate: ResponsesTemplate;
};

const snippetTabs: {
  label: string;
  generator: (params: SnippetParams) => string;
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

const ViewCodeModal: React.FC<ViewCodeModalProps> = ({
  isOpen,
  onClose,
  patternName,
  responsesTemplate,
}) => {
  const { namespace } = useParams();
  const { parameters } = useAutoragResultsContext();
  const dbSecretName = resolveDatabaseSecretName(parameters);
  const maasSecretName = resolveMaaSSecretName(parameters) ?? '';

  const snippetParams: SnippetParams = React.useMemo(
    () => ({
      template: responsesTemplate,
      namespace: namespace ?? '',
      dbSecretName: dbSecretName ?? '',
      maasSecretName,
    }),
    [responsesTemplate, namespace, dbSecretName, maasSecretName],
  );

  const [activeCodeTab, setActiveCodeTab] = React.useState(0);
  const [copiedTab, setCopiedTab] = React.useState<number | null>(null);

  const handleCopy = React.useCallback((text: string, tabIndex: number) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedTab(tabIndex);
        setTimeout(() => setCopiedTab(null), 2000);
        fireAutoragCodeSnippetsExported('copied');
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
        {!dbSecretName ? (
          <EmptyState variant={EmptyStateVariant.sm} status="warning" icon={ExclamationCircleIcon}>
            <EmptyStateBody>
              The database connection is unavailable for this historical run. Rerun or configure the
              run with its database connection to generate code snippets.
            </EmptyStateBody>
          </EmptyState>
        ) : !maasSecretName ? (
          <EmptyState variant={EmptyStateVariant.sm} status="warning" icon={ExclamationCircleIcon}>
            <EmptyStateBody>
              A MaaS connection is required to generate code snippets. Configure the run with a MaaS
              secret and try again.
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <>
            <Content component={ContentVariants.p} className="pf-v6-u-mb-md">
              Use these code snippets to query this pattern programmatically through the AutoRAG
              BFF. Set <code>DASHBOARD_URL</code> to the dashboard origin and{' '}
              <code>DASHBOARD_TOKEN</code> to a dashboard-authenticated token before running a
              snippet.
            </Content>
            <div className="autorag-view-code-modal__tabs-container">
              <Tabs
                activeKey={activeCodeTab}
                onSelect={(_e, key) => setActiveCodeTab(Number(key))}
                data-testid="view-code-tabs"
              >
                {snippetTabs.map((tab, index) => (
                  <Tab
                    key={tab.id}
                    eventKey={index}
                    title={<TabTitleText>{tab.label}</TabTitleText>}
                  >
                    <CodeBlock
                      className="pf-v6-u-mt-md autorag-view-code-modal__code-block"
                      actions={
                        <CodeBlockAction>
                          <ClipboardCopyButton
                            id={tab.id}
                            aria-label={tab.ariaLabel}
                            onClick={() => handleCopy(tab.generator(snippetParams), index)}
                            variant="plain"
                          >
                            {copiedTab === index ? 'Copied' : 'Copy'}
                          </ClipboardCopyButton>
                        </CodeBlockAction>
                      }
                    >
                      <CodeBlockCode>{tab.generator(snippetParams)}</CodeBlockCode>
                    </CodeBlock>
                  </Tab>
                ))}
              </Tabs>
            </div>
          </>
        )}
      </ModalBody>
    </Modal>
  );
};

export default ViewCodeModal;
