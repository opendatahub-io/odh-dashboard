import * as React from 'react';
import { Bullseye, EmptyState, EmptyStateBody, PageSection, Spinner } from '@patternfly/react-core';
import { Language, CodeEditor } from '@patternfly/react-code-editor';
import useDarkMode from '~/app/hooks/useDarkMode';
import { useSubscriptionManagementYaml } from '~/app/hooks/useSubscriptionManagementYaml';

type SubscriptionManagementYamlTabProps = {
  resourceName: string;
  resourceType: 'subscription' | 'authorizationpolicy';
};

const SubscriptionManagementYamlTab: React.FC<SubscriptionManagementYamlTabProps> = ({
  resourceName,
  resourceType,
}) => {
  const isDarkMode = useDarkMode();
  const [yaml, loaded, loadError] = useSubscriptionManagementYaml(resourceName, resourceType);

  if (!loaded) {
    return (
      <PageSection hasBodyWrapper={false}>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  if (loadError || !yaml) {
    return (
      <PageSection hasBodyWrapper={false}>
        <EmptyState headingLevel="h3" titleText="Unable to load YAML">
          <EmptyStateBody>The YAML content could not be retrieved.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <PageSection hasBodyWrapper={false} data-testid="resource-yaml-tab-content">
      <CodeEditor
        code={yaml}
        language={Language.yaml}
        isDarkTheme={isDarkMode}
        isReadOnly
        isCopyEnabled
        isDownloadEnabled
        isLanguageLabelVisible
        height="600px"
      />
    </PageSection>
  );
};

export default SubscriptionManagementYamlTab;
