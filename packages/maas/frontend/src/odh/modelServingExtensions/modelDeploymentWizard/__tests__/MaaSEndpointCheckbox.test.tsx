import { z } from 'zod';

type MaaSFieldValue = {
  isChecked: boolean;
};

const maasFieldSchema = z.object({
  isChecked: z.boolean(),
});

describe('MaaSEndpointCheckbox', () => {
  describe('maasFieldSchema validation', () => {
    it('should validate when checkbox is unchecked', () => {
      const value: MaaSFieldValue = { isChecked: false };
      const result = maasFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should validate when checkbox is checked', () => {
      const value: MaaSFieldValue = { isChecked: true };
      const result = maasFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should reject non-boolean isChecked values', () => {
      const value = { isChecked: 'true' };
      const result = maasFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
    });

    it('should reject missing isChecked', () => {
      const value = {};
      const result = maasFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
    });
  });
});
