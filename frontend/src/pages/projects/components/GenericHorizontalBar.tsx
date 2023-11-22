import * as React from 'react';
import {
  Tabs,
  Tab,
  TabTitleIcon,
  TabTitleText,
  TabContent,
  TabContentBody,
  PageSection,
  PageSectionVariants,
} from '@patternfly/react-core';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';

type GenericHorizontalBarProps = {
  activeKey: string;
  sections: {
    title: string;
    component: React.ReactNode;
    icon?: React.ReactElement<React.ComponentClass<SVGIconProps>>;
    id?: string;
  }[];
};

const GenericHorizontalBar: React.FC<GenericHorizontalBarProps> = ({ activeKey, sections }) => {
  const [activeTabKey, setActiveTabKey] = React.useState<string | number | undefined>(
    activeKey || sections[0].title || undefined,
  );

  return (
    <>
      <PageSection
        variant={PageSectionVariants.light}
        type="tabs"
        isFilled
        aria-label="horizontal-bar-tab-section"
      >
        <Tabs
          activeKey={activeTabKey}
          onSelect={(event, tabIndex) => setActiveTabKey(tabIndex)}
          aria-label="Horizontal bar"
        >
          {sections.map((section) => (
            <Tab
              key={section.title}
              eventKey={section.title}
              tabContentId={section.title}
              title={
                <>
                  {section.icon && <TabTitleIcon>{section.icon}</TabTitleIcon>}
                  <TabTitleText>{section.title}</TabTitleText>
                </>
              }
            />
          ))}
        </Tabs>
      </PageSection>
      <PageSection
        variant={PageSectionVariants.light}
        isFilled
        aria-label="horizontal-bar-content-section"
        padding={{ default: 'noPadding' }}
      >
        {sections
          .filter((section) => section.title === activeTabKey)
          .map((section) => (
            <TabContent
              id={section.title}
              activeKey={activeTabKey}
              eventKey={section.title}
              key={section.title}
            >
              <TabContentBody>{section.component}</TabContentBody>
            </TabContent>
          ))}
      </PageSection>
    </>
  );
};

export default GenericHorizontalBar;
