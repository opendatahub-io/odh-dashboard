import { IdentifiedLabelledToValuedLabelled } from '~/app/types';

describe('IdentifiedLabelledToValuedLabelled', () => {
  it('should key the converted option by id and preserve its label', () => {
    expect(
      IdentifiedLabelledToValuedLabelled({ id: 'full_integration', label: 'Full integration' }),
    ).toEqual({
      full_integration: {
        value: 'full_integration',
        label: 'Full integration',
      },
    });
  });
});
