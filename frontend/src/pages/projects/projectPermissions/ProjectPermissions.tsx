import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Bullseye,
  Button,
  Content,
  ContentVariants,
  Divider,
  Flex,
  PageSection,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import useFilters from '#~/utilities/useFilters';
import SubjectRolesTableSection from './SubjectRolesTableSection';
import {
  FilterDataType,
  initialFilterData,
  isSubjectScopeFilter,
  SubjectScopeFilter,
  subjectsFilterOptions,
  subjectsScopeOptions,
  SubjectsFilterOptions,
} from './const';

const ProjectPermissions: React.FC = () => {
  const { loaded, error } = usePermissionsContext();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [subjectScope, setSubjectScope] = React.useState<SubjectScopeFilter>(
    SubjectScopeFilter.all,
  );
  const { filterData, setFilterData, onClearFilters } =
    useFilters<FilterDataType>(initialFilterData);

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      aria-label="project-permissions-page-section"
      data-testid={`section-${ProjectSectionID.PERMISSIONS}`}
      id={ProjectSectionID.PERMISSIONS}
    >
      <Stack hasGutter>
        <StackItem>
          <Flex direction={{ default: 'column' }}>
            <Title headingLevel="h3" data-testid="permissions-tab-title">
              Permissions
            </Title>
            <Content component={ContentVariants.p} data-testid="permissions-tab-description">
              Manage who has access to this project by assigning roles to users and groups. To
              create or edit roles, go to the{' '}
              <Link
                data-testid="permissions-tab-roles-link"
                to={`/projects/${currentProject.metadata.name}?section=roles`}
              >
                <strong>Roles</strong> tab
              </Link>
              .
            </Content>
          </Flex>
        </StackItem>
        {!loaded ? (
          <StackItem>
            <Bullseye style={{ minHeight: 150 }}>
              <Spinner />
            </Bullseye>
          </StackItem>
        ) : error ? (
          <StackItem>
            <Alert variant="danger" title="Unable to load permissions data" isInline>
              {error.message}
            </Alert>
          </StackItem>
        ) : (
          <>
            <StackItem>
              <Toolbar clearAllFilters={onClearFilters}>
                <ToolbarContent>
                  <ToolbarItem>
                    <SimpleSelect
                      data-testid="permissions-subject-scope-dropdown"
                      dataTestId="permissions-subject-scope-dropdown-toggle"
                      aria-label="Subject scope"
                      icon={<FilterIcon />}
                      options={subjectsScopeOptions}
                      value={subjectScope}
                      onChange={(key) => {
                        if (isSubjectScopeFilter(key)) {
                          setSubjectScope(key);
                        }
                      }}
                      popperProps={{ appendTo: 'inline' }}
                    />
                  </ToolbarItem>
                  <Divider orientation={{ default: 'vertical' }} />
                  <FilterToolbar<SubjectsFilterOptions>
                    testId="permissions-filter-toolbar"
                    filterOptions={subjectsFilterOptions}
                    filterOptionRenders={{
                      [SubjectsFilterOptions.name]: ({ onChange, ...props }) => (
                        <SearchInput
                          {...props}
                          data-testid="permissions-filter-name-input"
                          aria-label="Find by name"
                          placeholder="Find by name"
                          onChange={(_e, v) => onChange(v)}
                        />
                      ),
                      [SubjectsFilterOptions.role]: ({ onChange, ...props }) => (
                        <SearchInput
                          {...props}
                          data-testid="permissions-filter-role-input"
                          aria-label="Find by role"
                          placeholder="Find by role"
                          onChange={(_e, v) => onChange(v)}
                        />
                      ),
                    }}
                    filterData={filterData}
                    onFilterUpdate={(key, value) => {
                      setFilterData((prev) => ({
                        ...prev,
                        [key]: typeof value === 'string' ? value : value?.value,
                      }));
                    }}
                  />
                  <ToolbarItem>
                    <Button
                      variant="primary"
                      data-testid="permissions-assign-roles-button"
                      component={(props: React.ComponentProps<'a'>) => (
                        <Link
                          {...props}
                          to={`/projects/${currentProject.metadata.name}/permissions/assign`}
                        />
                      )}
                      onClick={() => {
                        /* eslint-disable camelcase */
                        fireMiscTrackingEvent('RBAC Role Management Opened', {
                          manage_permissions_button: 'toolbar',
                        });
                        /* eslint-enable camelcase */
                      }}
                    >
                      Manage permissions
                    </Button>
                  </ToolbarItem>
                </ToolbarContent>
              </Toolbar>
            </StackItem>
            {subjectScope !== SubjectScopeFilter.group ? (
              <StackItem>
                <SubjectRolesTableSection
                  subjectKind="user"
                  filterData={filterData}
                  onClearFilters={onClearFilters}
                />
              </StackItem>
            ) : null}
            {subjectScope !== SubjectScopeFilter.user ? (
              <StackItem>
                <SubjectRolesTableSection
                  subjectKind="group"
                  filterData={filterData}
                  onClearFilters={onClearFilters}
                />
              </StackItem>
            ) : null}
          </>
        )}
      </Stack>
    </PageSection>
  );
};

export default ProjectPermissions;
