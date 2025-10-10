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
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { CodeIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import DashboardPopupIconButton from '#~/concepts/dashboard/DashboardPopupIconButton';
import useFeatureStoreConfigs from './useFeatureStoreConfigs';
import { FeatureStoreClientConfig } from './types';
import { generatePythonScript, getDefaultCodeBlockContent } from './utils';
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
    } else {
      const defaultContent = getDefaultCodeBlockContent();
      content = `${defaultContent.title}\n\n${defaultContent.description}`;
    }
    return content;
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
            Run this python script in your workbench
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
              <ClipboardCopyButton
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
                disabled={selectedConfigs.length === 0}
              >
                {copied ? 'Successfully copied to clipboard!' : 'Copy to clipboard'}
              </ClipboardCopyButton>
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
                <Title
                  headingLevel="h2"
                  size="lg"
                  color="var(--pf-t--global--text--color--regular)"
                  style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
                >
                  Generate Python script for connection
                </Title>
                <Content
                  component="p"
                  className={text.textColorSubtle}
                  style={{ fontSize: '0.8rem' }}
                >
                  Your connection script will appear here once you select configmaps from the list
                  on the left.
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
                        headerContent="About feature store client configmaps"
                        bodyContent={
                          <>
                            Feature store client configmaps are setup by your admin to connect to
                            feature store repositories independently. Each configmap holds the
                            settings to connect to feature store servers like offline, online,
                            registry, and more.
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
