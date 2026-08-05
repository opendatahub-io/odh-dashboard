/* eslint-disable camelcase */
/**
 * Maps benchmark IDs from the evaluations API to their corresponding
 * arXiv paper URLs. Sub-benchmarks (language/subject variants) share
 * the paper of their parent benchmark.
 *
 * Structure: exact ID → arXiv URL, with a prefix-based fallback
 * function for the many variant IDs that share a parent paper.
 */

const EXACT_BENCHMARK_PAPERS: Record<string, string> = {
  // --- LM Evaluation Harness benchmarks ---

  // ARC: AI2 Reasoning Challenge
  arc_easy: 'https://arxiv.org/abs/1803.05457',

  // ACLUE: Ancient Chinese Language Understanding Evaluation
  aclue_ancient_chinese_culture: 'https://arxiv.org/abs/2310.09550',

  // FLORES: African language translation
  african_flores: 'https://arxiv.org/abs/2207.04672',

  // AGIEval
  agieval_logiqa_zh: 'https://arxiv.org/abs/2304.06364',

  // BBQ: Bias Benchmark for QA
  bbq: 'https://arxiv.org/abs/2110.08193',

  // BoolQ
  // (used via AraDiCE and arabic_leaderboard wrappers; standalone not present)

  // CareQA: Healthcare QA from Spanish MIR exams
  careqa_open_perplexity: 'https://arxiv.org/abs/2502.06666',

  // C-Eval: Chinese evaluation suite
  'ceval-valid_college_programming': 'https://arxiv.org/abs/2305.08322',

  // COPA (Arabic): XCOPA cross-lingual causal reasoning
  copa_ar: 'https://arxiv.org/abs/2005.00333',

  // COPAL-ID: Indonesian colloquial COPA
  copal_id_colloquial: 'https://arxiv.org/abs/2311.01012',

  // CrowS-Pairs: Social bias measurement
  crows_pairs_english: 'https://arxiv.org/abs/2010.00133',

  // DarijaHellaSwag: HellaSwag in Moroccan Arabic (Darija)
  darijahellaswag: 'https://arxiv.org/abs/2409.17912',

  // EgyHellaSwag: HellaSwag in Egyptian Arabic
  egyhellaswag: 'https://arxiv.org/abs/2505.18383',

  // ETHICS: Aligning AI With Shared Human Values (commonsense morality)
  ethics_cm: 'https://arxiv.org/abs/2008.02275',

  // EusReading: Reading comprehension in Basque
  eus_reading: 'https://arxiv.org/abs/2403.20266',

  // GSM8K: Grade School Math (platinum = error-corrected variant)
  gsm8k_platinum_cot_llama: 'https://arxiv.org/abs/2110.14168',

  // HellaSwag (Arabic)
  hellaswag_ar: 'https://arxiv.org/abs/1905.07830',

  // IFEval: Instruction-Following Evaluation
  ifeval: 'https://arxiv.org/abs/2311.07911',

  // LongBench: Long-context understanding
  longbench_qasper: 'https://arxiv.org/abs/2308.14508',

  // MBPP: Mostly Basic Python Programming
  mbpp: 'https://arxiv.org/abs/2108.07732',

  // MetaBench: TruthfulQA permutation variant
  metabench_truthfulqa_permute: 'https://arxiv.org/abs/2407.12844',

  // MMLU (with CoT, Llama-style)
  mmlu_cot_llama: 'https://arxiv.org/abs/2009.03300',

  // Paloma: Perplexity across 546 domains
  paloma_wikitext_103: 'https://arxiv.org/abs/2312.10523',

  // Qasper: Information-seeking QA over research papers
  qasper_freeform: 'https://arxiv.org/abs/2105.03011',

  // QuALITY: Long-document multiple-choice QA
  quality: 'https://arxiv.org/abs/2112.08608',

  // RULER: Long-context evaluation
  ruler_qa_squad: 'https://arxiv.org/abs/2404.06654',

  // SCROLLS: Standardized CompaRison Over Long Language Sequences
  scrolls_qasper: 'https://arxiv.org/abs/2201.03533',

  // TinyTruthfulQA
  tinyTruthfulQA: 'https://arxiv.org/abs/2109.07958',

  // ToxiGen: Machine-generated toxicity dataset
  toxigen: 'https://arxiv.org/abs/2203.09509',

  // WikiText: Language modeling benchmark
  wikitext: 'https://arxiv.org/abs/1609.07843',

  // Winogender: Gender bias in coreference
  winogender: 'https://arxiv.org/abs/1804.09301',

  // --- Open LLM Leaderboard task wrappers ---
  leaderboard_bbh: 'https://arxiv.org/abs/2210.09261',
  leaderboard_bbh_salient_translation_error_detection: 'https://arxiv.org/abs/2210.09261',
  leaderboard_gpqa: 'https://arxiv.org/abs/2311.12022',
  leaderboard_ifeval: 'https://arxiv.org/abs/2311.07911',
  leaderboard_math_hard: 'https://arxiv.org/abs/2103.03874',
  leaderboard_mmlu_pro: 'https://arxiv.org/abs/2406.01574',
  leaderboard_musr: 'https://arxiv.org/abs/2310.16049',

  // --- Garak security scanning benchmarks ---
  // These are probe suites from the Garak LLM vulnerability scanner,
  // based on industry standards (OWASP, AVID taxonomy, MITRE CWE).
  // The arXiv link is the Garak framework paper itself.
  intents: 'https://arxiv.org/abs/2406.11036',
  owasp_llm_top10: 'https://arxiv.org/abs/2406.11036',
  avid: 'https://arxiv.org/abs/2406.11036',
  avid_security: 'https://arxiv.org/abs/2406.11036',
  avid_ethics: 'https://arxiv.org/abs/2406.11036',
  avid_performance: 'https://arxiv.org/abs/2406.11036',
  cwe: 'https://arxiv.org/abs/2406.11036',
  quick: 'https://arxiv.org/abs/2406.11036',
};

/**
 * Prefix rules for benchmark families where many variant IDs share
 * one parent paper. Ordered longest-prefix-first for correct matching.
 */
const PREFIX_BENCHMARK_PAPERS: [string, string][] = [
  // AraDiCE: Dialectal Arabic evaluation suite (wraps ArabicMMLU, BoolQ, etc.)
  ['AraDiCE_', 'https://arxiv.org/abs/2409.11404'],

  // AfriXNLI / IrokoBench: African language NLI
  ['afrixnli', 'https://arxiv.org/abs/2406.03368'],

  // Arabic Leaderboard: MT versions of English benchmarks (AceGPT suite)
  ['arabic_leaderboard_arabic_mmlu', 'https://arxiv.org/abs/2309.12053'],
  ['arabic_leaderboard_arabic_mt_', 'https://arxiv.org/abs/2309.12053'],
  ['arabic_mt_', 'https://arxiv.org/abs/2309.12053'],

  // BIG-Bench Hard
  ['bbh_cot_', 'https://arxiv.org/abs/2210.09261'],
  ['bbh', 'https://arxiv.org/abs/2210.09261'],

  // BIG-Bench
  ['bigbench_', 'https://arxiv.org/abs/2206.04615'],

  // BLiMP: Benchmark of Linguistic Minimal Pairs
  ['blimp', 'https://arxiv.org/abs/1912.00582'],

  // CMMLU: Chinese MMLU
  ['cmmlu_', 'https://arxiv.org/abs/2306.09212'],

  // CodeXGLUE: Code-to-text generation
  ['code2text_', 'https://arxiv.org/abs/2102.04664'],

  // Global MMLU
  ['global_mmlu_full_', 'https://arxiv.org/abs/2412.03304'],

  // HumanEval: Code generation
  ['humaneval', 'https://arxiv.org/abs/2107.03374'],

  // LAMBADA: Language Modeling Broadened to Account for Discourse Aspects
  ['lambada_', 'https://arxiv.org/abs/1606.06031'],

  // MRCR: Multi-Round Coreference Resolution (introduced in Gemini 1.5)
  ['mrcr', 'https://arxiv.org/abs/2403.05530'],

  // NorTruthfulQA: Norwegian TruthfulQA
  ['nortruthfulqa_', 'https://arxiv.org/abs/2501.11128'],

  // The Pile: A large-scale diverse language modeling dataset
  ['pile_', 'https://arxiv.org/abs/2101.00027'],

  // TruthfulQA (multi-lingual and standard variants)
  ['truthfulqa', 'https://arxiv.org/abs/2109.07958'],
];

/**
 * Returns the arXiv paper URL for a given benchmark ID, or undefined
 * if no mapping exists.
 */
export const getBenchmarkPaperUrl = (benchmarkId: string): string | undefined => {
  const exact = EXACT_BENCHMARK_PAPERS[benchmarkId];
  if (exact) {
    return exact;
  }

  for (const [prefix, url] of PREFIX_BENCHMARK_PAPERS) {
    if (benchmarkId.startsWith(prefix)) {
      return url;
    }
  }

  return undefined;
};

/**
 * Extracts just the arXiv paper ID (e.g. "2310.16049") from a full URL.
 */
export const getArxivId = (url: string): string | undefined => {
  const match = url.match(/arxiv\.org\/abs\/(\d+\.\d+)/);
  return match?.[1];
};
