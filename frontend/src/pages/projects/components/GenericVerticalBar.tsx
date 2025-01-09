import * as React from 'react';
import {
  generatePath,
  matchPath,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  PageSection,
  JumpLinks,
  JumpLinksItem,
  Sidebar,
  SidebarPanel,
  SidebarContent,
  Button,
} from '@patternfly/react-core';
import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';

type GenericVerticalBarProps = {
  activeKey: string | null;
  sections: {
    title: string;
    icon?: React.ReactElement<React.ComponentClass<SVGIconProps>>;
    id: string;
  }[];
  routes: string[];
};

const GenericVerticalBar: React.FC<GenericVerticalBarProps> = ({ activeKey, sections, routes }) => {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = React.useState<boolean>(true);

  return (
    <PageSection
      hasBodyWrapper={false}
      type="tabs"
      isFilled
      padding={{ default: 'noPadding' }}
      aria-label="horizontal-bar-tab-section"
    >
      <Sidebar>
        {navOpen ? (
          <SidebarPanel variant="sticky">
            <Button
              icon={<AngleDownIcon />}
              variant="plain"
              style={{
                marginLeft: 'var(--pf-t--global--spacer--md',
                marginBottom: 'var(--pf-t--global--spacer--xs',
              }}
              onClick={() => setNavOpen(false)}
            >
              All objects
            </Button>
            <JumpLinks isVertical style={{ paddingInlineStart: 'var(--pf-t--global--spacer--lg' }}>
              {sections.map((sect, index) => {
                const pathPattern = routes.find((pattern) => matchPath(pattern, location.pathname));
                const path = pathPattern
                  ? generatePath(pathPattern, {
                      namespace: params.namespace,
                      section: `${sect.id}`,
                    })
                  : `${location.pathname}/${sect.id}`;
                return (
                  <JumpLinksItem
                    href={path}
                    key={sect.id}
                    data-testid={`${sect.id}-tab`}
                    isActive={activeKey ? activeKey === sect.id : index === 0}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(path);
                    }}
                  >
                    {sect.title}
                  </JumpLinksItem>
                );
              })}
            </JumpLinks>
          </SidebarPanel>
        ) : null}
        <SidebarContent style={{ paddingBottom: 'var(--pf-t--global--spacer--lg)' }}>
          {!navOpen ? (
            <Button
              icon={<AngleRightIcon />}
              variant="plain"
              style={{ marginLeft: 'var(--pf-t--global--spacer--md' }}
              onClick={() => setNavOpen(true)}
            >
              All objects
            </Button>
          ) : null}
          <div className={!navOpen ? 'pf-v6-u-pt-md pf-v6-u-pl-lg' : undefined}>
            <Outlet />
          </div>
        </SidebarContent>
      </Sidebar>
    </PageSection>
  );
};

export default GenericVerticalBar;
