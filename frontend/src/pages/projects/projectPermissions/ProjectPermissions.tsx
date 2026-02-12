import * as React from 'react';
import {
  Alert,
  Bullseye,
  Button,
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
import { useNavigate } from 'react-router-dom';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import FilterToolbar from '#~/components/FilterToolbar';
import SimpleSelect from '#~/components/SimpleSelect';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
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
  const navigate = useNavigate();
  const { loaded, error } = usePermissionsContext();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const [subjectScope, setSubjectScope] = React.useState<SubjectScopeFilter>(
    SubjectScopeFilter.all,
  );
  const [filterData, setFilterData] = React.useState<FilterDataType>(initialFilterData);
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
                  <ToolbarItem>
                    <Button
                      variant="primary"
                      data-testid="permissions-assign-roles-button"
                      onClick={() =>
                        navigate(`/projects/${currentProject.metadata.name}/permissions/assign`)
                      }
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
                  onClearFilters={clearFilters}
                />
              </StackItem>
            ) : null}
            {subjectScope !== SubjectScopeFilter.user ? (
              <StackItem>
                <SubjectRolesTableSection
                  subjectKind="group"
                  filterData={filterData}
                  onClearFilters={clearFilters}
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
