import * as React from 'react';
import {
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  DataListCell,
  DataListToggle,
  DataListContent,
  Button,
  Content,
  Flex,
  FlexItem,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import type { RoleTemplate, RoleTemplateCategory } from './roleTemplateCatalog';

type TemplateCategoryGroupProps = {
  category: RoleTemplateCategory;
  actionLabel: string;
  onSelectTemplate: (template: RoleTemplate) => void;
};

const TemplateCategoryGroup: React.FC<TemplateCategoryGroupProps> = ({
  category,
  actionLabel,
  onSelectTemplate,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <DataListItem
      aria-labelledby={`category-${category.id}`}
      isExpanded={isExpanded}
      data-testid={`template-category-${category.id}`}
    >
      <DataListItemRow>
        <DataListToggle
          id={`toggle-${category.id}`}
          onClick={() => setIsExpanded((prev) => !prev)}
          isExpanded={isExpanded}
          aria-label={`Toggle ${category.name}`}
          data-testid={`toggle-category-${category.id}`}
        />
        <DataListItemCells
          dataListCells={[
            <DataListCell key="name">
              <Content component="p" id={`category-${category.id}`}>
                <strong>{category.name}</strong>
              </Content>
            </DataListCell>,
          ]}
        />
      </DataListItemRow>
      <DataListContent
        aria-label={`${category.name} templates`}
        id={`content-${category.id}`}
        isHidden={!isExpanded}
        hasNoPadding
      >
        {category.templates.map((template) => (
          <Split
            key={template.id}
            hasGutter
            data-testid={`template-item-${template.id}`}
            style={{
              padding:
                'var(--pf-t--global--spacer--md) var(--pf-t--global--spacer--lg) var(--pf-t--global--spacer--md) var(--pf-t--global--spacer--2xl)',
              borderTop: '1px solid var(--pf-t--global--border--color--default)',
            }}
          >
            <SplitItem isFilled>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXs' }}>
                <FlexItem>
                  <Content component="p">
                    <strong>{template.name}</strong>
                  </Content>
                </FlexItem>
                <FlexItem>
                  <Content component="small">{template.description}</Content>
                </FlexItem>
              </Flex>
            </SplitItem>
            <SplitItem>
              <Button
                variant="secondary"
                onClick={() => onSelectTemplate(template)}
                data-testid={`select-template-${template.id}`}
              >
                {actionLabel}
              </Button>
            </SplitItem>
          </Split>
        ))}
      </DataListContent>
    </DataListItem>
  );
};

export default TemplateCategoryGroup;
