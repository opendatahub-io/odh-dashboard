import * as React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  PageSection,
  Tabs,
  Tab,
  TabContent,
  TabContentBody,
  TabTitleText,
  Label,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { useExtensions, LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import GenAiCoreHeader from '~/app/GenAiCoreHeader';
import { genAiAiAssetsRoute } from '~/app/utilities/routes';
import AiAssetEndpointsIcon from '~/app/images/icons/AiAssetEndpointsIcon';
import { isAIAssetsTabExtension } from '~/odh/extension-points';

export const AIAssetsPage: React.FC = () => {
  const tabExtensions = useExtensions(isAIAssetsTabExtension);
  const [activeTabKey, setActiveTabKey] = React.useState<string>(
    tabExtensions[0]?.properties.id || '',
  );

  return (
    <ApplicationsPage
      title={
        <GenAiCoreHeader
          title="AI asset endpoints"
          getRedirectPath={genAiAiAssetsRoute}
          icon={AiAssetEndpointsIcon}
        />
      }
      description="Browse endpoints for models and MCP servers that are available as AI assets."
      loaded
      empty={false}
    >
      <PageSection>
        <Tabs
          activeKey={activeTabKey}
          onSelect={(_, tabKey) => {
            const newTabKey = String(tabKey);
            fireMiscTrackingEvent('AI Assets Tab Changed', {
              fromTab: activeTabKey,
              toTab: newTabKey,
            });
            setActiveTabKey(newTabKey);
          }}
          aria-label="AI Assets tabs"
          role="region"
        >
          {tabExtensions.map((extension) => (
            <Tab
              key={extension.properties.id}
              eventKey={extension.properties.id}
              title={
                <TabTitleText>
                  {extension.properties.label ? (
                    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>{extension.properties.title}</FlexItem>
                      <FlexItem>
                        <Label color="orange" variant="outline" isCompact>
                          {extension.properties.label}
                        </Label>
                      </FlexItem>
                    </Flex>
                  ) : (
                    extension.properties.title
                  )}
                </TabTitleText>
              }
              aria-label={`${extension.properties.title} tab`}
              tabContentId={`${extension.properties.id}-tab-content`}
              data-testid={`ai-assets-tab-${extension.properties.id}`}
            />
          ))}
        </Tabs>
      </PageSection>

      <PageSection>
        {tabExtensions.map((extension) => (
          <TabContent
            key={extension.properties.id}
            id={`${extension.properties.id}-tab-content`}
            activeKey={activeTabKey}
            eventKey={extension.properties.id}
            hidden={activeTabKey !== extension.properties.id}
          >
            <TabContentBody>
              {activeTabKey === extension.properties.id && (
                <LazyCodeRefComponent component={extension.properties.component} />
              )}
            </TabContentBody>
          </TabContent>
        ))}
      </PageSection>
    </ApplicationsPage>
  );
};
