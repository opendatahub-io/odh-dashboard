import * as React from 'react';
import {
  DataListItem,
  DataListItemRow,
  DataListItemCells,
  DataListCell,
  DataListToggle,
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
    <>
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
            // Override PF's buggy default of aria-controls="false" when no controlled region exists
            buttonProps={{ 'aria-controls': undefined }}
          />
          <DataListItemCells
            dataListCells={[
              <DataListCell key="name">
                <Content component="p" id={`category-${category.id}`}>
                  {category.name}
                </Content>
              </DataListCell>,
            ]}
          />
        </DataListItemRow>
      </DataListItem>
      {isExpanded &&
        category.templates.map((template) => (
          <DataListItem key={template.id} data-testid={`template-item-${template.id}`}>
            <DataListItemRow>
              <DataListItemCells
                className="pf-v6-u-pl-3xl"
                dataListCells={[
                  <DataListCell key="info" isFilled>
                    <Split hasGutter>
                      <SplitItem isFilled>
                        <Flex
                          direction={{ default: 'column' }}
                          spaceItems={{ default: 'spaceItemsXs' }}
                        >
                          <FlexItem>
                            <Content component="p">{template.name}</Content>
                          </FlexItem>
                          <FlexItem>
                            <Content component="p" className="pf-v6-u-text-color-subtle">
                              {template.description}
                            </Content>
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
                  </DataListCell>,
                ]}
              />
            </DataListItemRow>
          </DataListItem>
        ))}
    </>
  );
};

export default TemplateCategoryGroup;
