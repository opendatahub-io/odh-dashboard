import * as React from 'react';
import { DataList, Flex, SearchInput } from '@patternfly/react-core';
import ContentModal from '#~/components/modals/ContentModal';
import { ROLE_TEMPLATE_CATALOG, type RoleTemplate } from './roleTemplateCatalog';
import TemplateCategoryGroup from './TemplateCategoryGroup';

type SelectTemplateModalMode = 'select' | 'addRules';

type SelectTemplateModalProps = {
  mode: SelectTemplateModalMode;
  onSelectTemplate: (template: RoleTemplate) => void;
  onClose: () => void;
};

const MODAL_CONFIG = {
  select: {
    title: 'Select a role template',
    description: 'Choose a template to use as a starting point for your new role.',
    actionLabel: 'Select template',
  },
  addRules: {
    title: 'Add rules from template',
    description:
      'Select a template to add its rules to your role. Your other form entries will not be changed.',
    actionLabel: 'Add rules',
  },
} as const;

const SelectTemplateModal: React.FC<SelectTemplateModalProps> = ({
  mode,
  onSelectTemplate,
  onClose,
}) => {
  const [searchValue, setSearchValue] = React.useState('');
  const config = MODAL_CONFIG[mode];

  const filteredCategories = React.useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return ROLE_TEMPLATE_CATALOG;
    }
    return ROLE_TEMPLATE_CATALOG.map((category) => ({
      ...category,
      templates: category.templates.filter((t) => t.name.toLowerCase().includes(normalizedSearch)),
    })).filter((category) => category.templates.length > 0);
  }, [searchValue]);

  return (
    <ContentModal
      title={config.title}
      description={config.description}
      variant="medium"
      dataTestId="select-template-modal"
      onClose={onClose}
      noBodyPadding
      contents={
        <>
          <Flex className="pf-v6-u-py-md pf-v6-u-px-lg">
            <SearchInput
              placeholder="Find by name"
              value={searchValue}
              onChange={(_e, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              data-testid="template-search-input"
              aria-label="Search templates by name"
            />
          </Flex>
          <DataList aria-label="Role template categories">
            {filteredCategories.map((category) => (
              <TemplateCategoryGroup
                key={category.id}
                category={category}
                actionLabel={config.actionLabel}
                onSelectTemplate={onSelectTemplate}
              />
            ))}
          </DataList>
        </>
      }
    />
  );
};

export default SelectTemplateModal;
