import {
  formatDetectedLanguage,
  formatDetectedLanguageMetadata,
  getLanguageDisplayName,
  normalizeLanguageConfidencePercent,
} from '~/app/utilities/detectedLanguage';

describe('detectedLanguage utilities', () => {
  describe('getLanguageDisplayName', () => {
    it('should convert ISO 639-1 codes to English display names', () => {
      expect(getLanguageDisplayName('de')).toBe('German');
      expect(getLanguageDisplayName('ja')).toBe('Japanese');
      expect(getLanguageDisplayName('es')).toBe('Spanish');
    });

    it('should return the original value when the code is empty', () => {
      expect(getLanguageDisplayName('')).toBe('');
    });
  });

  describe('normalizeLanguageConfidencePercent', () => {
    it('should convert fractional confidence to a percentage', () => {
      expect(normalizeLanguageConfidencePercent(0.94)).toBe(94);
    });

    it('should round whole-number percentages', () => {
      expect(normalizeLanguageConfidencePercent(87.4)).toBe(87);
    });
  });

  describe('formatDetectedLanguage', () => {
    it('should format language with confidence', () => {
      expect(
        formatDetectedLanguage({
          languageCode: 'de',
          confidence: 0.94,
        }),
      ).toBe('German (94% confidence)');
    });

    it('should format language without confidence', () => {
      expect(
        formatDetectedLanguage({
          languageCode: 'de',
        }),
      ).toBe('German');
    });
  });

  describe('formatDetectedLanguageMetadata', () => {
    it('should format pipeline metadata using the language name', () => {
      expect(formatDetectedLanguageMetadata({ code: 'de', name: 'German' })).toBe('German');
    });

    it('should fall back to code when name is missing', () => {
      expect(formatDetectedLanguageMetadata({ code: 'ja' })).toBe('Japanese');
    });
  });
});
