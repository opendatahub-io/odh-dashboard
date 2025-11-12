import * as React from 'react';
import {
  Spinner,
  PageSection,
  StackItem,
  Stack,
  Flex,
  FlexItem,
  Title,
  Bullseye,
  Icon,
  Content,
  CodeBlock,
  CodeBlockCode,
  CodeBlockAction,
  ClipboardCopyButton,
  Popover,
  Button,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { CodeIcon, OutlinedQuestionCircleIcon, CopyIcon } from '@patternfly/react-icons';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import useFeatureStoreConfigs from './useFeatureStoreConfigs';
import { FeatureStoreClientConfig } from './types';
import { generatePythonScript } from './utils';
import FeatureStoreTable from './FeatureStoreTable';
import {
  FeatureStoreAlert,
  FeatureStoreTitle,
  FeatureStoreEmptyState,
  FeatureStoreErrorState,
} from './FeatureStoreIntegrationComponents';

const FeatureStoreIntegration: React.FC = () => {
  const navigate = useNavigate();
  const { data: featureStoreData, loaded, error } = useFeatureStoreConfigs();
  const [selectedConfigs, setSelectedConfigs] = React.useState<FeatureStoreClientConfig[]>([]);
  const [copied, setCopied] = React.useState(false);

  const codeBlockContent = React.useMemo(() => {
    let content: string;

    if (selectedConfigs.length > 0) {
      content = generatePythonScript(selectedConfigs);
      return content;
    }

    return '';
  }, [selectedConfigs]);

  React.useEffect(() => {
    setCopied(false);
  }, [selectedConfigs]);

  const clipboardCopyFunc = (textToCopy: string) => {
    navigator.clipboard
      .writeText(textToCopy)
      .catch((err) => console.error('Failed to copy to clipboard:', err));
  };

  const onCopyClick = (textToCopy: string) => {
    if (selectedConfigs.length === 0) {
      return;
    }
    clipboardCopyFunc(textToCopy);
    setCopied(true);
  };

  const { clientConfigs, namespaces } = featureStoreData;
  const isLoading = !loaded && !error;
  const hasError = !!error;
  const isEmpty = !hasError && clientConfigs.length === 0 && namespaces.length === 0;
  if (isLoading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  const renderCodeBlockSection = () => (
    <FlexItem flex={{ default: 'flex_2' }}>
      <Flex direction={{ default: 'column' }} gap={{ default: 'gapLg' }}>
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <Title headingLevel="h6" size="md">
            Python script
          </Title>
        </Flex>
        <CodeBlock
          style={{
            height: '500px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          actions={
            <CodeBlockAction>
              {selectedConfigs.length === 0 ? (
                <Button
                  data-testid="code-block-copy-button"
                  id="code-block-copy-button"
                  aria-label="Copy to clipboard"
                  variant="plain"
                  className="pf-m-color-subtle"
                  isDisabled
                  icon={<CopyIcon />}
                />
              ) : (
                <ClipboardCopyButton
                  data-testid="code-block-copy-button"
                  id="code-block-copy-button"
                  textId="code-block-content"
                  aria-label="Copy to clipboard"
                  onClick={() => onCopyClick(codeBlockContent)}
                  entryDelay={100}
                  exitDelay={copied ? 1500 : 600}
                  maxWidth="110px"
                  variant="plain"
                  onTooltipHidden={() => setCopied(false)}
                  className="pf-m-color-subtle"
                >
                  {copied ? 'Successfully copied to clipboard!' : 'Copy to clipboard'}
                </ClipboardCopyButton>
              )}
            </CodeBlockAction>
          }
        >
          <CodeBlockCode
            id="code-block-content"
            style={{
              flex: 1,
              overflow: 'auto',
              maxHeight: 'calc(500px - 80px)',
              minHeight: 0,
            }}
          >
            {selectedConfigs.length > 0 ? (
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  width: '100%',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {codeBlockContent}
              </pre>
            ) : (
              <Flex
                direction={{ default: 'column' }}
                alignItems={{ default: 'alignItemsCenter' }}
                style={{ padding: '2rem', textAlign: 'center' }}
              >
                <Icon type="custom" iconSize="2xl" size="2xl">
                  <CodeIcon style={{ color: 'var(--pf-t--color--gray--50)' }} />
                </Icon>
                <Title headingLevel="h2" size="lg" className="pf-v6-u-mb-md">
                  Select configmaps
                </Title>
                <Content
                  component="p"
                  className={text.textColorSubtle}
                  style={{ fontSize: '0.8rem' }}
                >
                  To automatically generate a Python integration script, select 1 or more configmaps
                  from the <strong>Feature store client configmaps</strong> section of this page.
                </Content>
              </Flex>
            )}
          </CodeBlockCode>
        </CodeBlock>
      </Flex>
    </FlexItem>
  );

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      aria-label="feature-store-integration-page-section"
      id={ProjectSectionID.FEATURE_STORE}
    >
      <Stack hasGutter>
        <StackItem>
          <FeatureStoreTitle title="Feature Store Integration" navigate={navigate} />
        </StackItem>
        {isEmpty ? (
          <StackItem>
            <FeatureStoreEmptyState />
          </StackItem>
        ) : (
          <>
            <StackItem>
              <FeatureStoreAlert />
            </StackItem>
            <StackItem>
              <Flex direction={{ default: 'row' }} gap={{ default: 'gapMd' }}>
                <FlexItem flex={{ default: 'flex_3' }}>
                  <Flex direction={{ default: 'column' }} gap={{ default: 'gapLg' }}>
                    <Flex>
                      <Title headingLevel="h6" size="md">
                        Feature store client configmaps
                      </Title>
                      <Popover
                        bodyContent={
                          <>
                            A feature store client configmap contains the settings required to
                            connect a feature store repository to a workbench.
                          </>
                        }
                      >
                        <DashboardPopupIconButton
                          icon={<OutlinedQuestionCircleIcon />}
                          aria-label="More info"
                        />
                      </Popover>
                    </Flex>
                    {hasError ? (
                      <FeatureStoreErrorState />
                    ) : (
                      <FeatureStoreTable
                        configs={clientConfigs}
                        loading={false}
                        onSelectionChange={setSelectedConfigs}
                      />
                    )}
                  </Flex>
                </FlexItem>
                {renderCodeBlockSection()}
              </Flex>
            </StackItem>
          </>
        )}
      </Stack>
    </PageSection>
  );
};

export default FeatureStoreIntegration;
