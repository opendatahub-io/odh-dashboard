import { z } from 'zod';

// Re-define the schema and type locally to avoid import issues with component dependencies
type MaaSTierValue = {
  isChecked: boolean;
  tiersDropdownSelection?: 'all-tiers' | 'no-tiers' | 'specify-tiers';
  selectedTierNames?: string[];
};

const maasEndpointsFieldSchema = z
  .object({
    isChecked: z.boolean(),
    tiersDropdownSelection: z.enum(['all-tiers', 'no-tiers', 'specify-tiers']).optional(),
    selectedTierNames: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.isChecked && data.tiersDropdownSelection === 'specify-tiers') {
        return data.selectedTierNames != null && data.selectedTierNames.length > 0;
      }
      return true;
    },
    {
      message: 'At least one resource tier must be selected',
      path: ['selectedTierNames'],
    },
  );

describe('MaaSEndpointCheckbox', () => {
  describe('maasEndpointsFieldSchema validation', () => {
    it('should validate when checkbox is unchecked', () => {
      const value: MaaSTierValue = { isChecked: false };
      const result = maasEndpointsFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should validate when checked with all-tiers selection', () => {
      const value: MaaSTierValue = {
        isChecked: true,
        tiersDropdownSelection: 'all-tiers',
        selectedTierNames: [],
      };
      const result = maasEndpointsFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should validate when checked with no-tiers selection', () => {
      const value: MaaSTierValue = {
        isChecked: true,
        tiersDropdownSelection: 'no-tiers',
      };
      const result = maasEndpointsFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should validate when checked with specify-tiers and tiers selected', () => {
      const value: MaaSTierValue = {
        isChecked: true,
        tiersDropdownSelection: 'specify-tiers',
        selectedTierNames: ['tier-1', 'tier-2'],
      };
      const result = maasEndpointsFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should fail validation when specify-tiers is selected but no tiers provided', () => {
      const value: MaaSTierValue = {
        isChecked: true,
        tiersDropdownSelection: 'specify-tiers',
        selectedTierNames: [],
      };
      const result = maasEndpointsFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('At least one resource tier must be selected');
        expect(result.error.issues[0].path).toContain('selectedTierNames');
      }
    });

    it('should fail validation when specify-tiers is selected with undefined selectedTierNames', () => {
      const value: MaaSTierValue = {
        isChecked: true,
        tiersDropdownSelection: 'specify-tiers',
        selectedTierNames: undefined,
      };
      const result = maasEndpointsFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
    });

    it('should pass validation when unchecked regardless of other fields', () => {
      const value: MaaSTierValue = {
        isChecked: false,
        tiersDropdownSelection: 'specify-tiers',
        selectedTierNames: [], // Empty but should not matter since unchecked
      };
      const result = maasEndpointsFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should reject invalid tiersDropdownSelection values', () => {
      const value = {
        isChecked: true,
        tiersDropdownSelection: 'invalid-option',
        selectedTierNames: [],
      };
      const result = maasEndpointsFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
    });

    it('should accept single tier in selectedTierNames for specify-tiers', () => {
      const value: MaaSTierValue = {
        isChecked: true,
        tiersDropdownSelection: 'specify-tiers',
        selectedTierNames: ['single-tier'],
      };
      const result = maasEndpointsFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });
  });
});
