import * as React from 'react';
import {
  Alert,
  Bullseye,
  Divider,
  PageSection,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import FilterToolbar from '#~/components/FilterToolbar';
import SimpleSelect from '#~/components/SimpleSelect';
import type { RoleRef } from '#~/concepts/permissions/types';
import SubjectRolesTableSection from './SubjectRolesTableSection';
import RoleDetailsModal from './roleDetails/RoleDetailsModal';
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
  const [subjectScope, setSubjectScope] = React.useState<SubjectScopeFilter>(
    SubjectScopeFilter.all,
  );
  const [filterData, setFilterData] = React.useState<FilterDataType>(initialFilterData);
  const [selectedRoleRef, setSelectedRoleRef] = React.useState<RoleRef>();

  const clearFilters = React.useCallback(() => {
    setFilterData(initialFilterData);
  }, []);

  return (
    <PageSection
      hasBodyWrapper={false}
      isFilled
      aria-label="project-permissions-page-section"
      data-testid={`section-${ProjectSectionID.PERMISSIONS}`}
      id={ProjectSectionID.PERMISSIONS}
    >
      <Stack hasGutter>
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
            {selectedRoleRef ? (
              <RoleDetailsModal
                roleRef={selectedRoleRef}
                onClose={() => setSelectedRoleRef(undefined)}
              />
            ) : null}
            <StackItem>
              <Toolbar clearAllFilters={clearFilters}>
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
                </ToolbarContent>
              </Toolbar>
            </StackItem>
            {subjectScope !== SubjectScopeFilter.group ? (
              <StackItem>
                <SubjectRolesTableSection
                  subjectKind="user"
                  filterData={filterData}
                  onClearFilters={clearFilters}
                  onRoleClick={setSelectedRoleRef}
                />
              </StackItem>
            ) : null}
            {subjectScope !== SubjectScopeFilter.user ? (
              <StackItem>
                <SubjectRolesTableSection
                  subjectKind="group"
                  filterData={filterData}
                  onClearFilters={clearFilters}
                  onRoleClick={setSelectedRoleRef}
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
