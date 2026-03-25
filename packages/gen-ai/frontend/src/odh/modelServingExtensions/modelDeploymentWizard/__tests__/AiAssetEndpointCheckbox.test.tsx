import { z } from 'zod';

// Regression test for RHOAIENG-37896: AAA checkbox feature flag gating
// This test ensures the field schema validates correctly

type AiAssetFieldValue = {
  saveAsAiAsset: boolean;
  useCase?: string;
};

const aiAssetFieldSchema = z.object({
  saveAsAiAsset: z.boolean(),
  useCase: z.string().optional(),
});

describe('AiAssetEndpointCheckbox', () => {
  describe('aiAssetFieldSchema validation', () => {
    it('should validate when checkbox is unchecked without use case', () => {
      const value: AiAssetFieldValue = { saveAsAiAsset: false };
      const result = aiAssetFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should validate when checkbox is checked without use case', () => {
      const value: AiAssetFieldValue = { saveAsAiAsset: true };
      const result = aiAssetFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should validate when checkbox is checked with use case', () => {
      const value: AiAssetFieldValue = {
        saveAsAiAsset: true,
        useCase: 'chat, multimodal',
      };
      const result = aiAssetFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should validate when checkbox is unchecked with empty use case', () => {
      const value: AiAssetFieldValue = {
        saveAsAiAsset: false,
        useCase: '',
      };
      const result = aiAssetFieldSchema.safeParse(value);
      expect(result.success).toBe(true);
    });

    it('should reject non-boolean saveAsAiAsset values', () => {
      const value = { saveAsAiAsset: 'true', useCase: 'test' };
      const result = aiAssetFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
    });

    it('should reject missing saveAsAiAsset', () => {
      const value = { useCase: 'test' };
      const result = aiAssetFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
    });

    it('should reject non-string useCase values', () => {
      const value = { saveAsAiAsset: true, useCase: 123 };
      const result = aiAssetFieldSchema.safeParse(value);
      expect(result.success).toBe(false);
    });
  });
});
