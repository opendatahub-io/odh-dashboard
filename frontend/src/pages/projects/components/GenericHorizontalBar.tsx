import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, Tab, TabTitleIcon, TabTitleText, PageSection } from '@patternfly/react-core';
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

  const activeSection = sections.find((section) => section.id === activeKey) || sections[0];

  return (
    <>
      <PageSection
        hasBodyWrapper={false}
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
          style={{ paddingInlineStart: 'var(--pf-t--global--spacer--lg' }}
        >
          {sections.map((section) => (
            <Tab
              key={section.id}
              eventKey={section.id}
              tabContentId={section.id}
              data-testid={`${section.id}-tab`}
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
      {activeSection.component}
    </>
  );
};

export default GenericHorizontalBar;
