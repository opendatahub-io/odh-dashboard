import { DraggableObject } from '@patternfly/react-drag-drop';

export type ColumnId = string;

export interface ManageableColumn extends DraggableObject {
  id: ColumnId;
  content: React.ReactNode;
  props: {
    checked: boolean;
  };
}
