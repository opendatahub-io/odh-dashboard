import { getBenchmarkDatasetUrl } from '~/app/utilities/benchmarkDatasetUrls';

describe('getBenchmarkDatasetUrl', () => {
  describe('exact matches', () => {
    it('should return the URL for an exact benchmark ID', () => {
      expect(getBenchmarkDatasetUrl('arc_easy')).toBe(
        'https://huggingface.co/datasets/allenai/ai2_arc',
      );
    });

    it('should return the URL for a key with hyphens', () => {
      expect(getBenchmarkDatasetUrl('ceval-valid_college_programming')).toBe(
        'https://huggingface.co/datasets/ceval/ceval-exam',
      );
    });

    it('should return the URL for a case-sensitive key', () => {
      expect(getBenchmarkDatasetUrl('tinyTruthfulQA')).toBe(
        'https://huggingface.co/datasets/tinyBenchmarks/tinyTruthfulQA',
      );
    });
  });

  describe('prefix matches', () => {
    it('should match a benchmark ID by prefix', () => {
      expect(getBenchmarkDatasetUrl('cmmlu_history')).toBe(
        'https://huggingface.co/datasets/haonan-li/cmmlu',
      );
    });

    it('should match the AraDiCE prefix', () => {
      expect(getBenchmarkDatasetUrl('AraDiCE_ArabicMMLU_some_variant')).toBe(
        'https://huggingface.co/datasets/QCRI/AraDiCE',
      );
    });

    it('should prefer longer prefix over shorter when both match', () => {
      expect(getBenchmarkDatasetUrl('bbh_cot_zeroshot')).toBe(
        'https://huggingface.co/datasets/lukaemon/bbh',
      );
      expect(getBenchmarkDatasetUrl('bbh_some_task')).toBe(
        'https://huggingface.co/datasets/lukaemon/bbh',
      );
    });
  });

  describe('exact match takes precedence over prefix', () => {
    it('should prefer exact match when a prefix would also match', () => {
      expect(getBenchmarkDatasetUrl('truthfulqa_mc1')).toBe(
        'https://huggingface.co/datasets/truthfulqa/truthful_qa',
      );
    });

    it('should prefer exact bigbench entry over bigbench_ prefix', () => {
      expect(getBenchmarkDatasetUrl('bigbench_hhh_alignment_multiple_choice')).toBe(
        'https://huggingface.co/datasets/HuggingFaceH4/hhh_alignment',
      );
    });
  });

  describe('no match', () => {
    it('should return undefined for an unknown benchmark ID', () => {
      expect(getBenchmarkDatasetUrl('completely_unknown_benchmark')).toBeUndefined();
    });

    it('should return undefined for an empty string', () => {
      expect(getBenchmarkDatasetUrl('')).toBeUndefined();
    });

    it.each(['constructor', 'toString', '__proto__'])(
      'should return undefined for inherited Object.prototype key "%s"',
      (key) => {
        expect(getBenchmarkDatasetUrl(key)).toBeUndefined();
      },
    );
  });
});
