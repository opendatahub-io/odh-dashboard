/* eslint-disable camelcase */

const EXACT_BENCHMARK_DATASETS: Record<string, string> = {
  // --- LM Evaluation Harness benchmarks ---

  // ACLUE: Ancient Chinese Language Understanding Evaluation
  aclue_ancient_chinese_culture: 'https://huggingface.co/datasets/tyousei/aclue',

  // ARC: AI2 Reasoning Challenge
  arc_easy: 'https://huggingface.co/datasets/allenai/ai2_arc',

  // AraDiCE: individual sub-benchmarks that differ from the ArabicMMLU prefix
  AraDiCE_openbookqa_eng: 'https://huggingface.co/datasets/allenai/openbookqa',
  AraDiCE_piqa_lev: 'https://huggingface.co/datasets/ybisk/piqa',
  AraDiCE_truthfulqa_mc1_lev: 'https://huggingface.co/datasets/truthfulqa/truthful_qa',
  AraDiCE_winogrande_eng: 'https://huggingface.co/datasets/allenai/winogrande',

  // Arabic MT: individual benchmarks that map to distinct datasets
  arabic_mt_boolq_light: 'https://huggingface.co/datasets/google/boolq',
  arabic_mt_hellaswag: 'https://huggingface.co/datasets/Rowan/hellaswag',
  arabic_mt_piqa: 'https://huggingface.co/datasets/ybisk/piqa',
  arabic_mt_race_light: 'https://huggingface.co/datasets/ehovy/race',

  // FLORES: African language translation
  african_flores: 'https://huggingface.co/datasets/facebook/flores',

  // AGIEval
  agieval_logiqa_zh: 'https://huggingface.co/datasets/baber/agieval',

  // BBQ: Bias Benchmark for QA
  bbq: 'https://huggingface.co/datasets/heegyu/bbq',

  // BIG-Bench: HHH Alignment (distinct dataset from the bigbench_ prefix)
  bigbench_hhh_alignment_multiple_choice:
    'https://huggingface.co/datasets/HuggingFaceH4/hhh_alignment',

  // CareQA: Healthcare QA from Spanish MIR exams
  careqa_open_perplexity: 'https://huggingface.co/datasets/BigAction/CareQA',

  // C-Eval: Chinese evaluation suite
  'ceval-valid_college_programming': 'https://huggingface.co/datasets/ceval/ceval-exam',

  // COPA (Arabic): XCOPA cross-lingual causal reasoning
  copa_ar: 'https://huggingface.co/datasets/cambridgeltl/xcopa',

  // COPAL-ID: Indonesian colloquial COPA
  copal_id_colloquial: 'https://huggingface.co/datasets/haryoaw/COPAL-ID',

  // CrowS-Pairs: Social bias measurement
  crows_pairs_english: 'https://huggingface.co/datasets/nyu-mll/crows_pairs',

  // DarijaHellaSwag: HellaSwag in Moroccan Arabic (Darija)
  darijahellaswag: 'https://huggingface.co/datasets/Rowan/hellaswag',

  // EgyHellaSwag: HellaSwag in Egyptian Arabic
  egyhellaswag: 'https://huggingface.co/datasets/Rowan/hellaswag',

  // ETHICS: Aligning AI With Shared Human Values (commonsense morality)
  ethics_cm: 'https://huggingface.co/datasets/hendrycks/ethics',

  // EusReading: Reading comprehension in Basque
  eus_reading: 'https://huggingface.co/datasets/HiTZ/eus_reading',

  // GSM8K: Grade School Math (platinum = error-corrected variant)
  gsm8k_platinum_cot_llama: 'https://huggingface.co/datasets/openai/gsm8k',

  // HellaSwag (Arabic)
  hellaswag_ar: 'https://huggingface.co/datasets/Rowan/hellaswag',

  // IFEval: Instruction-Following Evaluation
  ifeval: 'https://huggingface.co/datasets/google/IFEval',

  // LongBench: Long-context understanding
  longbench_qasper: 'https://huggingface.co/datasets/THUDM/LongBench',

  // MBPP: Mostly Basic Python Programming
  mbpp: 'https://huggingface.co/datasets/google-research-datasets/mbpp',

  // MetaBench: TruthfulQA permutation variant
  metabench_truthfulqa_permute: 'https://huggingface.co/datasets/truthfulqa/truthful_qa',

  // MMLU (with CoT, Llama-style)
  mmlu_cot_llama: 'https://huggingface.co/datasets/cais/mmlu',

  // Paloma: Perplexity across 546 domains
  paloma_wikitext_103: 'https://huggingface.co/datasets/Salesforce/wikitext',

  // Qasper: Information-seeking QA over research papers
  qasper_freeform: 'https://huggingface.co/datasets/allenai/qasper',

  // RULER: Long-context evaluation
  ruler_qa_squad: 'https://huggingface.co/datasets/rajpurkar/squad',

  // SCROLLS: Standardized CompaRison Over Long Language Sequences
  scrolls_qasper: 'https://huggingface.co/datasets/tau/scrolls',

  // TinyTruthfulQA
  tinyTruthfulQA: 'https://huggingface.co/datasets/truthfulqa/truthful_qa',

  // ToxiGen: Machine-generated toxicity dataset
  toxigen: 'https://huggingface.co/datasets/microsoft/toxigen',

  // TruthfulQA MC1 (standalone)
  truthfulqa_mc1: 'https://huggingface.co/datasets/truthfulqa/truthful_qa',

  // WikiText: Language modeling benchmark
  wikitext: 'https://huggingface.co/datasets/Salesforce/wikitext',

  // Winogender: Gender bias in coreference
  winogender: 'https://huggingface.co/datasets/super_glue',

  // --- Open LLM Leaderboard task wrappers ---
  leaderboard_bbh: 'https://huggingface.co/datasets/lukaemon/bbh',
  leaderboard_bbh_salient_translation_error_detection:
    'https://huggingface.co/datasets/lukaemon/bbh',
  leaderboard_gpqa: 'https://huggingface.co/datasets/Idavidrein/gpqa',
  leaderboard_ifeval: 'https://huggingface.co/datasets/google/IFEval',
  leaderboard_math_hard: 'https://huggingface.co/datasets/lighteval/MATH-Hard',
  leaderboard_mmlu_pro: 'https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro',
  leaderboard_musr: 'https://huggingface.co/datasets/TAUR-Lab/MuSR',
};

/**
 * Prefix rules for benchmark families where many variant IDs share
 * one parent dataset. Ordered longest-prefix-first for correct matching.
 */
const PREFIX_BENCHMARK_DATASETS: [string, string][] = [
  // AraDiCE: ArabicMMLU variants
  ['AraDiCE_ArabicMMLU', 'https://huggingface.co/datasets/MBZUAI/ArabicMMLU'],

  // AfriXNLI / IrokoBench: African language NLI
  ['afrixnli', 'https://huggingface.co/datasets/masakhane/afrixnli'],

  // Arabic Leaderboard: sub-family prefixes (longest first)
  ['arabic_leaderboard_arabic_mmlu', 'https://huggingface.co/datasets/MBZUAI/ArabicMMLU'],
  ['arabic_leaderboard_arabic_mt_boolq', 'https://huggingface.co/datasets/google/boolq'],
  ['arabic_leaderboard_arabic_mt_copa', 'https://huggingface.co/datasets/cambridgeltl/xcopa'],
  ['arabic_leaderboard_arabic_mt_hellaswag', 'https://huggingface.co/datasets/Rowan/hellaswag'],
  ['arabic_leaderboard_arabic_mt_piqa', 'https://huggingface.co/datasets/ybisk/piqa'],
  ['arabic_leaderboard_arabic_mt_race', 'https://huggingface.co/datasets/ehovy/race'],

  // BIG-Bench Hard
  ['bbh_cot_', 'https://huggingface.co/datasets/lukaemon/bbh'],
  ['bbh', 'https://huggingface.co/datasets/lukaemon/bbh'],

  // BIG-Bench
  ['bigbench_', 'https://huggingface.co/datasets/google/bigbench'],

  // BLiMP: Benchmark of Linguistic Minimal Pairs
  ['blimp', 'https://huggingface.co/datasets/nyu-mll/blimp'],

  // CMMLU: Chinese MMLU
  ['cmmlu_', 'https://huggingface.co/datasets/haonan-li/cmmlu'],

  // CodeXGLUE: Code-to-text generation
  ['code2text_', 'https://huggingface.co/datasets/code_x_glue_ct_code_to_text'],

  // Global MMLU
  ['global_mmlu_full_', 'https://huggingface.co/datasets/CohereForAI/Global-MMLU'],

  // HumanEval: Code generation
  ['humaneval', 'https://huggingface.co/datasets/openai/openai_humaneval'],

  // LAMBADA: Language Modeling Broadened to Account for Discourse Aspects
  ['lambada_', 'https://huggingface.co/datasets/EleutherAI/lambada_openai'],

  // MRCR: Multi-Round Coreference Resolution
  ['mrcr', 'https://huggingface.co/datasets/google/mrcr'],

  // NorTruthfulQA: Norwegian TruthfulQA
  ['nortruthfulqa_', 'https://huggingface.co/datasets/NorMistral/NorTruthfulQA'],

  // The Pile: A large-scale diverse language modeling dataset
  ['pile_', 'https://huggingface.co/datasets/EleutherAI/pile'],

  // TruthfulQA (multi-lingual and standard variants)
  ['truthfulqa', 'https://huggingface.co/datasets/truthfulqa/truthful_qa'],
];

/**
 * Returns the HuggingFace dataset URL for a given benchmark ID, or undefined
 * if no mapping exists.
 */
export const getBenchmarkDatasetUrl = (benchmarkId: string): string | undefined => {
  if (Object.hasOwn(EXACT_BENCHMARK_DATASETS, benchmarkId)) {
    return EXACT_BENCHMARK_DATASETS[benchmarkId];
  }

  for (const [prefix, url] of PREFIX_BENCHMARK_DATASETS) {
    if (benchmarkId.startsWith(prefix)) {
      return url;
    }
  }

  return undefined;
};
