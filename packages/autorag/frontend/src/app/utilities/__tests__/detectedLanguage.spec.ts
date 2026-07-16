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

    it('should return the original code when the language is unknown', () => {
      expect(getLanguageDisplayName('xyz')).toBe('xyz');
    });

    it('should return the code when Intl.DisplayNames is unavailable', () => {
      const displayNames = Intl.DisplayNames;
      Object.defineProperty(Intl, 'DisplayNames', {
        configurable: true,
        value: undefined,
      });

      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getLanguageDisplayName: getDisplayName } = require('../detectedLanguage');
        expect(getDisplayName('de')).toBe('de');
      });

      Object.defineProperty(Intl, 'DisplayNames', {
        configurable: true,
        value: displayNames,
      });
    });
  });

  describe('normalizeLanguageConfidencePercent', () => {
    it('should round percentage confidence values on a 0–100 scale', () => {
      expect(normalizeLanguageConfidencePercent(94)).toBe(94);
      expect(normalizeLanguageConfidencePercent(87.4)).toBe(87);
    });

    it('should interpret 1 as 1% confidence', () => {
      expect(normalizeLanguageConfidencePercent(1)).toBe(1);
    });
  });

  describe('formatDetectedLanguage', () => {
    it('should format language with confidence', () => {
      expect(
        formatDetectedLanguage({
          languageCode: 'de',
          confidence: 94,
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
