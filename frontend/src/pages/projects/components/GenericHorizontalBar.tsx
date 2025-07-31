import * as React from 'react';
import { Tabs, Tab, TabTitleIcon, TabTitleText, PageSection } from '@patternfly/react-core';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';

export type SectionDefinition = {
  title: string;
  component: React.ReactNode;
  icon?: React.ReactElement<React.ComponentClass<SVGIconProps>>;
  id: string;
};

type GenericHorizontalBarProps = {
  activeKey: string | null;
  sections: [SectionDefinition, ...SectionDefinition[]];
  onSectionChange: (sectionId: SectionDefinition['id'], replace?: boolean) => void;
};

const GenericHorizontalBar: React.FC<GenericHorizontalBarProps> = ({
  activeKey,
  sections,
  onSectionChange,
}) => {
  React.useEffect(() => {
    if (activeKey && !sections.find((s) => s.id === activeKey)) {
      onSectionChange(sections[0].id, true);
    }
  }, [sections, activeKey, onSectionChange]);

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
          activeKey={activeSection.id}
          onSelect={(event, tabIndex) => {
            onSectionChange(`${tabIndex}`);
          }}
          aria-label="Horizontal bar"
          usePageInsets
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
      <div id={activeSection.id} role="tabpanel" aria-labelledby={`${activeSection.id}-tab`}>
        {activeSection.component}
      </div>
    </>
  );
};

export default GenericHorizontalBar;
