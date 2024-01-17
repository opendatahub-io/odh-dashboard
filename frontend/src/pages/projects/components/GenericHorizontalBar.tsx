import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
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
  activeKey: string | null;
  sections: {
    title: string;
    component: React.ReactNode;
    icon?: React.ReactElement<React.ComponentClass<SVGIconProps>>;
    id: string;
  }[];
};

const GenericHorizontalBar: React.FC<GenericHorizontalBarProps> = ({ activeKey, sections }) => {
  const [queryParams, setQueryParams] = useSearchParams();

  React.useEffect(() => {
    if (!sections.find((s) => s.id === activeKey) && sections[0].id) {
      queryParams.set('section', sections[0].id);
      setQueryParams(queryParams, { replace: true });
    }
  }, [sections, activeKey, queryParams, setQueryParams]);

  return (
    <>
      <PageSection
        variant={PageSectionVariants.light}
        type="tabs"
        isFilled
        padding={{ default: 'noPadding' }}
        aria-label="horizontal-bar-tab-section"
      >
        <Tabs
          activeKey={activeKey || sections[0].id}
          onSelect={(event, tabIndex) => {
            queryParams.set('section', `${tabIndex}`);
            setQueryParams(queryParams);
          }}
          aria-label="Horizontal bar"
          style={{ paddingInlineStart: 'var(--pf-v5-global--spacer--lg' }}
        >
          {sections.map((section) => (
            <Tab
              key={section.id}
              eventKey={section.id}
              tabContentId={section.id}
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
          .filter((section) => section.id === activeKey)
          .map((section) => (
            <TabContent
              id={section.id}
              activeKey={activeKey || ''}
              eventKey={section.id}
              key={section.id}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              <TabContentBody style={{ flex: 1 }}>{section.component}</TabContentBody>
            </TabContent>
          ))}
      </PageSection>
    </>
  );
};

export default GenericHorizontalBar;
