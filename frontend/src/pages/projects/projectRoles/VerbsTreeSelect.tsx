import * as React from 'react';
import { Content, TreeView, TreeViewDataItem } from '@patternfly/react-core';
import { VERB_CATEGORIES, ALL_VERBS_WILDCARD, ALL_INDIVIDUAL_VERBS } from './verbCategories';

type VerbsTreeSelectProps = {
  selectedVerbs: string[];
  onSelectedVerbsChange: (verbs: string[]) => void;
};

const VerbsTreeSelect: React.FC<VerbsTreeSelectProps> = ({
  selectedVerbs,
  onSelectedVerbsChange,
}) => {
  const isAllSelected = selectedVerbs.includes(ALL_VERBS_WILDCARD);

  const handleCheck = React.useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, item: TreeViewDataItem) => {
      const itemId = item.id ?? '';

      if (itemId === 'all') {
        onSelectedVerbsChange(isAllSelected ? [] : [ALL_VERBS_WILDCARD]);
        return;
      }

      if (isAllSelected) {
        return;
      }

      const category = VERB_CATEGORIES.find((c) => c.id === itemId);
      if (category) {
        const categoryVerbs = category.verbs.map((v) => v.verb);
        const allCategorySelected = categoryVerbs.every((v) => selectedVerbs.includes(v));

        if (allCategorySelected) {
          onSelectedVerbsChange(selectedVerbs.filter((v) => !categoryVerbs.includes(v)));
        } else {
          const merged = new Set([...selectedVerbs, ...categoryVerbs]);
          onSelectedVerbsChange([...merged]);
        }
        return;
      }

      if (selectedVerbs.includes(itemId)) {
        onSelectedVerbsChange(selectedVerbs.filter((v) => v !== itemId));
      } else {
        onSelectedVerbsChange([...selectedVerbs, itemId]);
      }
    },
    [selectedVerbs, onSelectedVerbsChange, isAllSelected],
  );

  const treeData = React.useMemo((): TreeViewDataItem[] => {
    const categoryNodes: TreeViewDataItem[] = VERB_CATEGORIES.map((category) => {
      const categoryVerbs = category.verbs.map((v) => v.verb);
      const allCategorySelected =
        isAllSelected || categoryVerbs.every((v) => selectedVerbs.includes(v));
      const someCategorySelected =
        !allCategorySelected && categoryVerbs.some((v) => selectedVerbs.includes(v));

      return {
        id: category.id,
        name: (
          <>
            <strong>{category.label}:</strong> {category.description}
          </>
        ),
        hasCheckbox: true,
        defaultExpanded: true,
        checkProps: {
          checked: allCategorySelected || (someCategorySelected ? null : false),
        },
        children: category.verbs.map((verbInfo) => ({
          id: verbInfo.verb,
          name: (
            <>
              <strong>{verbInfo.label}:</strong> {verbInfo.description}
            </>
          ),
          hasCheckbox: true,
          checkProps: {
            checked: isAllSelected || selectedVerbs.includes(verbInfo.verb),
          },
        })),
      };
    });

    const allSelected =
      isAllSelected || ALL_INDIVIDUAL_VERBS.every((v) => selectedVerbs.includes(v));
    const someSelected =
      !allSelected && ALL_INDIVIDUAL_VERBS.some((v) => selectedVerbs.includes(v));

    return [
      {
        id: 'all',
        name: <strong>All operations</strong>,
        hasCheckbox: true,
        defaultExpanded: true,
        checkProps: {
          checked: allSelected || (someSelected ? null : false),
        },
        children: categoryNodes,
      },
    ];
  }, [selectedVerbs, isAllSelected]);

  return (
    <div data-testid="verbs-tree-select">
      <Content component="p">
        Select the actions this rule allows on the chosen resources. Selecting &quot;All
        operations&quot; grants the wildcard (*) verb, which includes all current and future
        Kubernetes verbs beyond those listed here.
      </Content>
      <TreeView data={treeData} hasCheckboxes onCheck={handleCheck} aria-label="Permission verbs" />
    </div>
  );
};

export default VerbsTreeSelect;
