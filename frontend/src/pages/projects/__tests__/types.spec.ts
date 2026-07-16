import { SecretCategory } from '#~/pages/projects/types';

describe('SecretCategory', () => {
  it('should include EXISTING category', () => {
    expect(SecretCategory.EXISTING).toBe('secret existing');
  });
});
