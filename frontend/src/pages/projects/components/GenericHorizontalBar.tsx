import * as React from 'react';
import {
  generatePath,
  matchPath,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { Tabs, Tab, TabTitleIcon, TabTitleText, PageSection } from '@patternfly/react-core';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';

type GenericHorizontalBarProps = {
  activeKey: string | null;
  sections: {
    title: string;
    icon?: React.ReactElement<React.ComponentClass<SVGIconProps>>;
    id: string;
  }[];
  routes: string[];
};

const GenericHorizontalBar: React.FC<GenericHorizontalBarProps> = ({
  activeKey,
  sections,
  routes,
}) => {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

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
            const pathPattern = routes.find((pattern) => matchPath(pattern, location.pathname));
            if (pathPattern) {
              const path = generatePath(pathPattern, {
                namespace: params.namespace,
                section: `${tabIndex}`,
              });
              navigate(path);
            }
          }}
          aria-label="Horizontal bar"
          style={{ paddingInlineStart: 'var(--pf-t--global--spacer--lg' }}
        >
          {sections.map((tabSection) => (
            <Tab
              key={tabSection.id}
              eventKey={tabSection.id}
              tabContentId={tabSection.id}
              data-testid={`${tabSection.id}-tab`}
              title={
                <>
                  {tabSection.icon && <TabTitleIcon>{tabSection.icon}</TabTitleIcon>}
                  <TabTitleText>{tabSection.title}</TabTitleText>
                </>
              }
            />
          ))}
        </Tabs>
        <Outlet />
      </PageSection>
    </>
  );
};

export default GenericHorizontalBar;
