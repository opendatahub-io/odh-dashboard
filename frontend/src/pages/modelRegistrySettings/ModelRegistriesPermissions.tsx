import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  ClipboardCopy,
  Tab,
  TabContent,
  TabContentBody,
  Tabs,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { Navigate, useParams } from 'react-router';
import { KnownLabels, RoleBindingKind } from '~/k8sTypes';
import { useGroups } from '~/api';
import RoleBindingPermissions from '~/concepts/roleBinding/RoleBindingPermissions';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { MODEL_REGISTRY_DEFAULT_NAMESPACE } from '~/concepts/modelRegistry/const';
import { SupportedArea } from '~/concepts/areas';
import { RoleBindingPermissionsRoleType } from '~/concepts/roleBinding/types';
import useModelRegistryRoleBindings from './useModelRegistryRoleBindings';

const ModelRegistriesManagePermissions: React.FC = () => {
  const [activeTabKey, setActiveTabKey] = React.useState('users');
  const [groups] = useGroups();
  const roleBindings = useContextResourceData<RoleBindingKind>(useModelRegistryRoleBindings());
  const { mrName } = useParams();
  const filteredRoleBindings = roleBindings.data.filter(
    (rb) => rb.metadata.labels?.['app.kubernetes.io/name'] === mrName,
  );
  if (roleBindings.loaded && filteredRoleBindings.length === 0) {
    return <Navigate to="/modelRegistrySettings" replace />;
  }

  return (
    <ApplicationsPage
      title={`Manage permissions of ${mrName}`}
      description="Manage users and projects that can access this model registry."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem>Settings</BreadcrumbItem>
          <BreadcrumbItem
            render={() => <Link to="/modelRegistrySettings">Model registry settings</Link>}
          />
          <BreadcrumbItem isActive>Manage Permissions</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
      provideChildrenPadding
    >
      <Tabs
        activeKey={activeTabKey}
        onSelect={(e, tabKey) => {
          setActiveTabKey(tabKey.toString());
        }}
      >
        <Tab eventKey="users" title="Users" id="users-tab" tabContentId="users-tab-content" />
        <Tab
          eventKey="projects"
          title="Projects"
          id="projects-tab"
          tabContentId="projects-tab-content"
        />
      </Tabs>
      <div>
        <TabContent id="users-tab-content" eventKey="users" hidden={activeTabKey !== 'users'}>
          <TabContentBody>
            <RoleBindingPermissions
              defaultRoleBindingName={`${mrName}-users`}
              isGroupFirst
              permissionOptions={[
                {
                  type: RoleBindingPermissionsRoleType.DEFAULT,
                  description: 'Default role for all users',
                },
              ]}
              roleKind="Role"
              roleRef={`registry-user-${mrName}`}
              labels={{
                [KnownLabels.DASHBOARD_RESOURCE]: 'true',
                app: mrName || '',
                'app.kubernetes.io/component': SupportedArea.MODEL_REGISTRY,
                'app.kubernetes.io/part-of': SupportedArea.MODEL_REGISTRY,
                'app.kubernetes.io/name': mrName || '',
                component: SupportedArea.MODEL_REGISTRY,
              }}
              projectName={MODEL_REGISTRY_DEFAULT_NAMESPACE}
              description={
                <>
                  To enable access for all cluster users, add{' '}
                  <ClipboardCopy variant="inline-compact">system.authenticated</ClipboardCopy> to
                  the group list.
                </>
              }
              roleBindingPermissionsRB={{ ...roleBindings, data: filteredRoleBindings }}
              groups={groups}
            />
          </TabContentBody>
        </TabContent>
        <TabContent
          id="projects-tab-content"
          eventKey="projects"
          hidden={activeTabKey !== 'projects'}
        >
          TODO: This feature is not yet implemented
        </TabContent>
      </div>
    </ApplicationsPage>
  );
};

export default ModelRegistriesManagePermissions;
