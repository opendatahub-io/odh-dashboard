export declare enum ModelCatalogStringFilterKey {
    TASK = "tasks",
    PROVIDER = "provider",
    LICENSE = "license",
    LANGUAGE = "language",
    TENSOR_TYPE = "tensor_type.string_value",
    HARDWARE_TYPE = "artifacts.hardware_type.string_value",
    HARDWARE_CONFIGURATION = "artifacts.hardware_configuration.string_value",
    USE_CASE = "artifacts.use_case.string_value"
}
export declare enum ModelCatalogNumberFilterKey {
    MAX_RPS = "artifacts.requests_per_second.double_value"
}
/**
 * Short property keys for accessing artifact customProperties directly.
 * These correspond to the performance filter keys but without the artifacts.* prefix and suffix.
 */
export declare const PerformancePropertyKey: {
    readonly HARDWARE_TYPE: "hardware_type";
    readonly HARDWARE_CONFIGURATION: "hardware_configuration";
    readonly USE_CASE: "use_case";
    readonly REQUESTS_PER_SECOND: "requests_per_second";
};
export type PerformancePropertyKeyType = (typeof PerformancePropertyKey)[keyof typeof PerformancePropertyKey];
/**
 * The name of the default performance filters named query.
 * Used to look up default filter values in the namedQueries object.
 */
export declare const DEFAULT_PERFORMANCE_FILTERS_QUERY_NAME = "default-performance-filters";
export declare enum LatencyMetric {
    E2E = "E2E",// End to End
    TTFT = "TTFT",// Time To First Token
    TPS = "TPS",// Tokens Per Second
    ITL = "ITL"
}
export declare const LatencyMetricLabels: Partial<Record<LatencyMetric, string>>;
export declare const latencyMetricDescriptions: Partial<Record<LatencyMetric, string>>;
export declare enum LatencyPercentile {
    Mean = "Mean",
    P90 = "P90",
    P95 = "P95",
    P99 = "P99"
}
/**
 * Short key format for accessing artifact customProperties (e.g., 'ttft_p90')
 */
export type LatencyPropertyKey = `${Lowercase<LatencyMetric>}_${Lowercase<LatencyPercentile>}`;
/**
 * Full key format for filter state, matching backend namedQueries format
 * (e.g., 'artifacts.ttft_p90.double_value')
 */
export type LatencyFilterKey = `artifacts.${LatencyPropertyKey}.double_value`;
export type LatencyMetricFieldName = LatencyFilterKey;
/**
 * Gets the short property key for accessing artifact customProperties (e.g., 'ttft_p90')
 */
export declare const getLatencyPropertyKey: (metric: LatencyMetric, percentile: LatencyPercentile) => LatencyPropertyKey;
/**
 * Gets the full filter key for filter state, matching backend namedQueries format
 * (e.g., 'artifacts.ttft_p90.double_value')
 */
export declare const getLatencyFilterKey: (metric: LatencyMetric, percentile: LatencyPercentile) => LatencyFilterKey;
/**
 * All possible latency property keys (short format for customProperties access)
 */
export declare const ALL_LATENCY_PROPERTY_KEYS: LatencyPropertyKey[];
/**
 * All possible latency filter keys (full format for filter state)
 */
export declare const ALL_LATENCY_FILTER_KEYS: LatencyFilterKey[];
export declare const isLatencyFilterKey: (value: string) => value is LatencyFilterKey;
/**
 * Parses a LatencyFilterKey to extract the metric and percentile
 */
export declare const parseLatencyFilterKey: (filterKey: LatencyFilterKey) => {
    metric: LatencyMetric;
    percentile: LatencyPercentile;
    propertyKey: LatencyPropertyKey;
};
export declare enum UseCaseOptionValue {
    CHATBOT = "chatbot",
    CODE_FIXING = "code_fixing",
    LONG_RAG = "long_rag",
    RAG = "rag"
}
export declare enum ModelCatalogTask {
    AUDIO_TO_TEXT = "audio-to-text",
    IMAGE_TEXT_TO_TEXT = "image-text-to-text",
    IMAGE_TO_TEXT = "image-to-text",
    TEXT_EMBEDDING = "text-embedding",
    TEXT_GENERATION = "text-generation",
    TEXT_TO_TEXT = "text-to-text",
    TOOL_CALLING = "tool-calling",
    VIDEO_TO_TEXT = "video-to-text"
}
export declare const MODEL_CATALOG_TASK_NAME_MAPPING: {
    "audio-to-text": string;
    "image-text-to-text": string;
    "image-to-text": string;
    "text-embedding": string;
    "text-generation": string;
    "text-to-text": string;
    "tool-calling": string;
    "video-to-text": string;
};
export declare const MODEL_CATALOG_TASK_DESCRIPTION: {
    "audio-to-text": string;
    "image-text-to-text": string;
    "image-to-text": string;
    "text-embedding": string;
    "text-generation": string;
    "text-to-text": string;
    "tool-calling": string;
    "video-to-text": string;
};
export declare enum ModelCatalogProvider {
    ALIBABA_CLOUD = "Alibaba Cloud",
    DEEPSEEK = "DeepSeek",
    GOOGLE = "Google",
    IBM = "IBM",
    META = "Meta",
    MISTRAL_AI = "Mistral AI",
    MOONSHOT_AI = "Moonshot AI",
    NEURAL_MAGIC = "Neural Magic",
    NVIDIA = "NVIDIA",
    NVIDIA_ALTERNATE = "Nvidia",// alternate casing
    RED_HAT = "Red Hat"
}
export declare const MODEL_CATALOG_PROVIDER_NAME_MAPPING: {
    "Alibaba Cloud": string;
    DeepSeek: string;
    Google: string;
    IBM: string;
    Meta: string;
    "Mistral AI": string;
    "Moonshot AI": string;
    "Neural Magic": string;
    NVIDIA: string;
    Nvidia: string;
    "Red Hat": string;
};
export declare const MODEL_CATALOG_PROVIDER_NOTABLE_MODELS: {
    "Alibaba Cloud": string;
    DeepSeek: string;
    Google: string;
    IBM: string;
    Meta: string;
    "Mistral AI": string;
    "Moonshot AI": string;
    "Neural Magic": string;
    NVIDIA: string;
    Nvidia: string;
    "Red Hat": string;
};
export declare enum ModelCatalogTensorType {
    FP16 = "FP16",
    FP8 = "FP8",
    INT4 = "INT4",
    INT8 = "INT8",
    MXFP4 = "MXFP4"
}
export declare const MODEL_CATALOG_POPOVER_MESSAGES: {
    readonly VALIDATED: "Validated models are benchmarked for performance and quality using leading open source evaluation datasets.";
    readonly RED_HAT: "Red Hat AI models are provided and supported by Red Hat.";
};
export declare enum CatalogModelCustomPropertyKey {
    VALIDATED_ON = "validated_on",
    TENSOR_TYPE = "tensor_type",
    SIZE = "size",
    ARCHITECTURE = "architecture",
    MODEL_TYPE = "model_type"
}
export declare enum ModelType {
    GENERATIVE = "generative",
    PREDICTIVE = "predictive",
    UNKNOWN = "unknown"
}
export declare enum EuropeanLanguagesCode {
    BG = "bg",
    CA = "ca",
    CS = "cs",
    DA = "da",
    DE = "de",
    EL = "el",
    EN = "en",
    ES = "es",
    FI = "fi",
    FR = "fr",
    HR = "hr",
    HU = "hu",
    IS = "is",
    IT = "it",
    NL = "nl",
    NLD = "nld",
    NO = "no",
    PL = "pl",
    PT = "pt",
    RO = "ro",
    RU = "ru",
    SK = "sk",
    SL = "sl",
    SR = "sr",
    SV = "sv",
    UK = "uk"
}
export declare const MODEL_CATALOG_EUROPEAN_LANGUAGES_DETAILS: {
    bg: string;
    ca: string;
    cs: string;
    da: string;
    de: string;
    el: string;
    en: string;
    es: string;
    fi: string;
    fr: string;
    hr: string;
    hu: string;
    is: string;
    it: string;
    nl: string;
    nld: string;
    no: string;
    pl: string;
    pt: string;
    ro: string;
    ru: string;
    sk: string;
    sl: string;
    sr: string;
    sv: string;
    uk: string;
};
export declare enum AsianLanguagesCode {
    JA = "ja",
    KO = "ko",
    ZH = "zh",
    HI = "hi",
    TH = "th",
    VI = "vi",
    ID = "id",
    MS = "ms",
    ZSM = "zsm"
}
export declare const MODEL_CATALOG_ASIAN_LANGUAGES_DETAILS: {
    ja: string;
    ko: string;
    zh: string;
    hi: string;
    th: string;
    vi: string;
    id: string;
    ms: string;
    zsm: string;
};
export declare enum MiddleEasternAndOtherLanguagesCode {
    AR = "ar",
    FA = "fa",
    HE = "he",
    TR = "tr",
    UR = "ur",
    TL = "tl"
}
export declare const MODEL_CATALOG_MIDDLE_EASTERN_AND_OTHER_LANGUAGES_DETAILS: {
    ar: string;
    fa: string;
    he: string;
    tr: string;
    ur: string;
    tl: string;
};
export declare const AllLanguageCodesMap: {
    ar: string;
    fa: string;
    he: string;
    tr: string;
    ur: string;
    tl: string;
    ja: string;
    ko: string;
    zh: string;
    hi: string;
    th: string;
    vi: string;
    id: string;
    ms: string;
    zsm: string;
    bg: string;
    ca: string;
    cs: string;
    da: string;
    de: string;
    el: string;
    en: string;
    es: string;
    fi: string;
    fr: string;
    hr: string;
    hu: string;
    is: string;
    it: string;
    nl: string;
    nld: string;
    no: string;
    pl: string;
    pt: string;
    ro: string;
    ru: string;
    sk: string;
    sl: string;
    sr: string;
    sv: string;
    uk: string;
};
export declare enum AllLanguageCode {
    BG = "bg",
    CA = "ca",
    CS = "cs",
    DA = "da",
    DE = "de",
    EL = "el",
    EN = "en",
    ES = "es",
    FI = "fi",
    FR = "fr",
    HR = "hr",
    HU = "hu",
    IS = "is",
    IT = "it",
    NL = "nl",
    NLD = "nld",
    NO = "no",
    PL = "pl",
    PT = "pt",
    RO = "ro",
    RU = "ru",
    SK = "sk",
    SL = "sl",
    SR = "sr",
    SV = "sv",
    UK = "uk",
    JA = "ja",
    KO = "ko",
    ZH = "zh",
    HI = "hi",
    TH = "th",
    VI = "vi",
    ID = "id",
    MS = "ms",
    ZSM = "zsm",
    AR = "ar",
    FA = "fa",
    HE = "he",
    TR = "tr",
    UR = "ur",
    TL = "tl"
}
export type ModelCatalogFilterKey = ModelCatalogStringFilterKey | ModelCatalogNumberFilterKey | LatencyMetricFieldName;
/**
 * All possible filter keys combining string, number, and latency field keys
 */
export declare const ALL_CATALOG_FILTER_KEYS: ModelCatalogFilterKey[];
/**
 * Type guard to check if a string is a valid ModelCatalogFilterKey
 */
export declare const isCatalogFilterKey: (key: string) => key is ModelCatalogFilterKey;
/**
 * Basic filter keys that appear on the catalog landing page (non-performance filters).
 */
export declare const BASIC_FILTER_KEYS: ModelCatalogFilterKey[];
/**
 * Performance filter keys that are shown when performance view is enabled.
 * These filters should reset to default values (from namedQueries) instead of clearing.
 * Note: HARDWARE_CONFIGURATION is NOT included here because it should clear normally
 * like basic filters, not reset to defaults.
 */
export declare const PERFORMANCE_FILTER_KEYS: ModelCatalogFilterKey[];
/**
 * Check if a filter key is a performance filter (should reset to default instead of clear).
 */
export declare const isPerformanceFilterKey: (filterKey: ModelCatalogFilterKey) => boolean;
/**
 * Performance string filter keys (arrays of strings).
 * Add new string-based performance filters here.
 */
export declare const PERFORMANCE_STRING_FILTER_KEYS: ModelCatalogStringFilterKey[];
/**
 * Performance number filter keys (single number values).
 * Add new number-based performance filters here.
 */
export declare const PERFORMANCE_NUMBER_FILTER_KEYS: ModelCatalogNumberFilterKey[];
/**
 * Check if a filter key is a performance string filter.
 */
export declare const isPerformanceStringFilterKey: (filterKey: string) => filterKey is ModelCatalogStringFilterKey;
/**
 * Check if a filter key is a performance number filter.
 */
export declare const isPerformanceNumberFilterKey: (filterKey: string) => filterKey is ModelCatalogNumberFilterKey;
/**
 * Gets performance filter keys to show in the hardware configuration toolbar.
 * Only shows performance filters (not basic filters).
 * Includes HARDWARE_CONFIGURATION which is shown in performance toolbar but clears normally.
 */
export declare const getPerformanceFiltersToShow: (filterData: Partial<Record<LatencyMetricFieldName, number | undefined>>) => ModelCatalogFilterKey[];
/**
 * Gets all filter keys to show when performance view is enabled.
 * Includes basic filters, performance filters, and any active latency filters.
 */
export declare const getAllFiltersToShow: (filterData: Partial<Record<LatencyMetricFieldName, number | undefined>>) => ModelCatalogFilterKey[];
/**
 * Display names for filter categories.
 * Includes all ModelCatalogFilterKeys (ModelCatalogStringFilterKey | ModelCatalogNumberFilterKey | LatencyMetricFieldName).
 */
export declare const MODEL_CATALOG_FILTER_CATEGORY_NAMES: Record<ModelCatalogFilterKey, string>;
export declare const MODEL_CATALOG_FILTER_CHIP_PREFIXES: {
    readonly WORKLOAD_TYPE: "Workload type:";
    readonly MAX_RPS: "Max RPS:";
    readonly LATENCY_METRIC: "Metric:";
    readonly LATENCY_PERCENTILE: "Percentile:";
    readonly LATENCY_THRESHOLD: "Under";
};
export declare enum ModelDetailsTab {
    OVERVIEW = "overview",
    PERFORMANCE_INSIGHTS = "performance-insights"
}
export declare const EMPTY_CUSTOM_PROPERTY_VALUE = "-";
export declare enum ModelCatalogSortOption {
    RECENT_PUBLISH = "recent_publish",
    LOWEST_LATENCY = "lowest_latency"
}
export declare enum SortOrder {
    ASC = "ASC",
    DESC = "DESC"
}
export declare enum SortField {
    LAST_UPDATE_TIME = "LAST_UPDATE_TIME"
}
