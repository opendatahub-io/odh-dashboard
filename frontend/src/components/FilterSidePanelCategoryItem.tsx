import * as React from 'react';
import { css } from '@patternfly/react-styles';
import { Checkbox, CheckboxProps } from '@patternfly/react-core';

export interface FilterSidePanelCategoryItemProps {
  id: string;
  /** Children nodes */
  children: React.ReactNode;
  /** Additional css classes for the Filter Panel Property Item */
  className?: string;
  /** Optional icon (or other) to show before the children */
  icon?: React.ReactNode;
  /** Optional count of the items matching the filter */
  count?: number | null;
  /** Callback for a click on the Filter Item Checkbox */
  onChange?: CheckboxProps['onChange'];
  /** Flag to show if the Filter Item Checkbox is checked. */
  checked?: boolean;
  /** Title of the checkbox  */
  title?: string;
}

// FIXME: Remove this component when https://github.com/patternfly/patternfly-react/issues/5940 is resolved
const FilterSidePanelCategoryItem: React.FunctionComponent<FilterSidePanelCategoryItemProps> = ({
  id,
  children = null,
  className = '',
  icon = null,
  count = null,
  onChange,
  checked = false,
  title = '',
  ...props
}: FilterSidePanelCategoryItemProps) => {
  const classes = css('filter-panel-pf-category-item', className);
  const label = (
    <>
      {icon && <span className="item-icon">{icon}</span>}
      {children}
      {count !== null && Number.isInteger(count) && (
        <span className="item-count">{`(${count})`}</span>
      )}
    </>
  );
  return (
    <div id={id} className={classes} {...props}>
      <Checkbox
        onChange={onChange}
        isChecked={checked}
        data-testid={id}
        id={`${id}--check-box`}
        label={label}
        title={title}
      />
    </div>
  );
};
FilterSidePanelCategoryItem.displayName = 'FilterSidePanelCategoryItem';

export default FilterSidePanelCategoryItem;
