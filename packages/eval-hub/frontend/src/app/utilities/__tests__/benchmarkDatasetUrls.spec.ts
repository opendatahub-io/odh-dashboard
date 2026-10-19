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

    it.each([
      ['telemath', 'https://huggingface.co/datasets/netop/TeleMath'],
      ['teleqna', 'https://huggingface.co/datasets/netop/TeleQnA'],
      ['telelogs', 'https://huggingface.co/datasets/netop/TeleLogs'],
      ['3gpp-tsg', 'https://huggingface.co/datasets/GSMA/ot-lite'],
      ['inspect/telemath', 'https://huggingface.co/datasets/netop/TeleMath'],
      ['inspect/teleqna', 'https://huggingface.co/datasets/netop/TeleQnA'],
      ['inspect/telelogs', 'https://huggingface.co/datasets/netop/TeleLogs'],
      ['inspect/3gpp-tsg', 'https://huggingface.co/datasets/GSMA/ot-lite'],
    ])('should return the URL for the Open-Telco benchmark %s', (id, url) => {
      expect(getBenchmarkDatasetUrl(id)).toBe(url);
    });

    it.each([
      ['longbenchv2', 'https://huggingface.co/datasets/zai-org/LongBench-v2'],
      ['aime24', 'https://huggingface.co/datasets/HuggingFaceH4/aime_2024'],
      ['aime25', 'https://huggingface.co/datasets/yentinglin/aime_2025'],
      ['arc:challenge', 'https://huggingface.co/datasets/allenai/ai2_arc'],
      ['arc:easy', 'https://huggingface.co/datasets/allenai/ai2_arc'],
      ['glue:cola', 'https://huggingface.co/datasets/nyu-mll/glue'],
      ['glue:mrpc', 'https://huggingface.co/datasets/nyu-mll/glue'],
      ['glue:sst2', 'https://huggingface.co/datasets/nyu-mll/glue'],
      ['gpqa:diamond', 'https://huggingface.co/datasets/Idavidrein/gpqa'],
      ['gsm8k', 'https://huggingface.co/datasets/openai/gsm8k'],
      ['hellaswag', 'https://huggingface.co/datasets/Rowan/hellaswag'],
      ['math_500', 'https://huggingface.co/datasets/HuggingFaceH4/MATH-500'],
      ['math:algebra', 'https://huggingface.co/datasets/DigitalLearningGmbH/MATH-lighteval'],
      [
        'math:counting_and_probability',
        'https://huggingface.co/datasets/DigitalLearningGmbH/MATH-lighteval',
      ],
      [
        'lcb:codegeneration_v6',
        'https://huggingface.co/datasets/livecodebench/code_generation_lite',
      ],
      ['mmlu', 'https://huggingface.co/datasets/cais/mmlu'],
      ['openbookqa', 'https://huggingface.co/datasets/allenai/openbookqa'],
      ['piqa', 'https://huggingface.co/datasets/ybisk/piqa'],
      ['triviaqa', 'https://huggingface.co/datasets/mandarjoshi/trivia_qa'],
      ['winogrande', 'https://huggingface.co/datasets/allenai/winogrande'],
      ['ifbench', 'https://huggingface.co/datasets/allenai/IFBench_test'],
      ['inspect/agentharm', 'https://huggingface.co/datasets/ai-safety-institute/AgentHarm'],
      ['inspect/aime2024', 'https://huggingface.co/datasets/HuggingFaceH4/aime_2024'],
      ['inspect/aime2025', 'https://huggingface.co/datasets/math-ai/aime25'],
      ['inspect/arc', 'https://huggingface.co/datasets/allenai/ai2_arc'],
      ['inspect/bbh', 'https://huggingface.co/datasets/lukaemon/bbh'],
      [
        'inspect/bfcl',
        'https://huggingface.co/datasets/gorilla-llm/Berkeley-Function-Calling-Leaderboard',
      ],
      ['inspect/bigcodebench', 'https://huggingface.co/datasets/bigcode/bigcodebench'],
      ['inspect/gaia', 'https://huggingface.co/datasets/gaia-benchmark/GAIA'],
      ['inspect/gpqa', 'https://huggingface.co/datasets/Idavidrein/gpqa'],
      ['inspect/gsm8k', 'https://huggingface.co/datasets/openai/gsm8k'],
      ['inspect/hellaswag', 'https://huggingface.co/datasets/Rowan/hellaswag'],
      ['inspect/hle', 'https://huggingface.co/datasets/cais/hle'],
      ['inspect/humaneval', 'https://huggingface.co/datasets/openai/openai_humaneval'],
      ['inspect/mask', 'https://huggingface.co/datasets/cais/MASK'],
      ['inspect/mbpp', 'https://huggingface.co/datasets/google-research-datasets/mbpp'],
      ['inspect/mmlu', 'https://huggingface.co/datasets/cais/mmlu'],
      ['inspect/mmlu-pro', 'https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro'],
      ['inspect/simpleqa', 'https://huggingface.co/datasets/basicv8vc/SimpleQA'],
      ['inspect/strong-reject', 'https://huggingface.co/datasets/walledai/StrongREJECT'],
      ['inspect/swe-bench', 'https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified'],
      ['inspect/truthfulqa', 'https://huggingface.co/datasets/truthfulqa/truthful_qa'],
      ['inspect/winogrande', 'https://huggingface.co/datasets/allenai/winogrande'],
      ['inspect/wmdp', 'https://huggingface.co/datasets/cais/wmdp'],
    ])('should return the URL for a catalog benchmark %s', (id, url) => {
      expect(getBenchmarkDatasetUrl(id)).toBe(url);
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
