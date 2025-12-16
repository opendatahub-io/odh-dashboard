import * as React from 'react';
import { Badge, Checkbox, ExpandableSection, List, ListItem } from '@patternfly/react-core';
import ContentModal from '#~/components/modals/ContentModal';
import { ConnectionTypeField, SectionField } from '#~/concepts/connectionTypes/types';

type Props = {
  field: SectionField;
  onClose: (submit: boolean, removeFields: boolean) => void;
  fields: ConnectionTypeField[];
};

const ConnectionTypeSectionRemoveModal: React.FC<Props> = ({ field, fields, onClose }) => {
  const [removedFields, setRemovedFields] = React.useState(false);

  return (
    <ContentModal
      title="Remove section?"
      onClose={() => onClose(false, false)}
      variant="small"
      dataTestId="connection-type-section-remove-modal"
      buttonActions={[
        {
          label: 'Remove',
          onClick: () => onClose(true, removedFields),
          variant: 'primary',
          dataTestId: 'modal-submit-button',
        },
        {
          label: 'Cancel',
          onClick: () => onClose(false, false),
          variant: 'link',
          clickOnEnter: true,
          dataTestId: 'modal-cancel-button',
        },
      ]}
      contents={
        <>
          <div>
            The <b>{field.name}</b> section heading will be removed.
          </div>
          {fields.length > 0 ? (
            <div className="pf-v6-u-mt-md">
              <Checkbox
                id="remove-fields-checkbox"
                data-testid="remove-fields-checkbox"
                label="Remove associated fields"
                isChecked={removedFields}
                onChange={(_, checked) => setRemovedFields(checked)}
              />
              <ExpandableSection
                className="pf-v6-u-mt-md"
                isIndented
                toggleContent={
                  <>
                    Associated fields <Badge isRead>{fields.length}</Badge>
                  </>
                }
              >
                <List>
                  {fields.map((f, i) => (
                    <ListItem key={i}>{f.name}</ListItem>
                  ))}
                </List>
              </ExpandableSection>
            </div>
          ) : null}
        </>
      }
    />
  );
};

export default ConnectionTypeSectionRemoveModal;
