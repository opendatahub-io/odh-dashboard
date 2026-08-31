import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Content,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  PageSection,
  Stack,
  StackItem,
  type MenuToggleElement,
} from '@patternfly/react-core';
import { CubesIcon, ServerIcon } from '@patternfly/react-icons';
import { OpenShellConnectionChip } from './OpenShellConnection';
import { DEPLOYMENTS_PATH, NATIVE_PROVIDER_PATH, OPENSHELL_PROVIDER_PATH } from './providerRoutes';

type ProviderHeaderProps = {
  provider?: 'openshell' | 'native';
};

const ProviderHeader: React.FC<ProviderHeaderProps> = ({ provider = 'openshell' }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const isOpenShell = provider === 'openshell';
  const providerName = isOpenShell ? 'OpenShell' : 'Agent sandbox CRs';
  const ProviderIcon = isOpenShell ? ServerIcon : CubesIcon;

  return (
    <PageSection hasBodyWrapper={false} className="pf-v6-u-py-md">
      <Stack hasGutter>
        <StackItem>
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to={DEPLOYMENTS_PATH}>All providers</Link>
            </BreadcrumbItem>
            <BreadcrumbItem isActive>{providerName}</BreadcrumbItem>
          </Breadcrumb>
        </StackItem>
        <StackItem>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
            gap={{ default: 'gapLg' }}
          >
            <FlexItem grow={{ default: 'grow' }}>
              <Dropdown
                isOpen={isOpen}
                onOpenChange={setIsOpen}
                onSelect={() => setIsOpen(false)}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle
                    ref={toggleRef}
                    isExpanded={isOpen}
                    onClick={() => setIsOpen((open) => !open)}
                    icon={<ProviderIcon />}
                    data-testid="provider-selector-toggle"
                  >
                    {providerName}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem
                    icon={<ServerIcon />}
                    isSelected={isOpenShell}
                    onClick={() => navigate(OPENSHELL_PROVIDER_PATH)}
                  >
                    OpenShell
                  </DropdownItem>
                  <DropdownItem
                    icon={<CubesIcon />}
                    isSelected={!isOpenShell}
                    onClick={() => navigate(NATIVE_PROVIDER_PATH)}
                  >
                    Agent sandbox CRs
                  </DropdownItem>
                  <DropdownItem onClick={() => navigate(DEPLOYMENTS_PATH)}>
                    Compare all providers
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </FlexItem>
            {isOpenShell && (
              <FlexItem>
                <OpenShellConnectionChip />
              </FlexItem>
            )}
          </Flex>
        </StackItem>
        <StackItem>
          <Content component="p" className="pf-v6-u-mb-0">
            {isOpenShell
              ? 'Separate service with its own sign-in. Access is scoped by workspace, independent of your platform projects.'
              : 'Upstream agent-sandbox custom resources running in your projects, governed by the same RBAC as your other workloads.'}
          </Content>
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default ProviderHeader;
