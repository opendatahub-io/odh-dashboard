export declare enum ModelCatalogStringFilterKey {
    TASK = "tasks",
    PROVIDER = "provider",
    LICENSE = "license",
    LANGUAGE = "language"
}
export declare enum ModelCatalogNumberFilterKey {
}
export declare enum ModelCatalogTask {
    AUDIO_TO_TEXT = "audio-to-text",
    IMAGE_TEXT_TO_TEXT = "image-text-to-text",
    IMAGE_TO_TEXT = "image-to-text",
    TEXT_GENERATION = "text-generation",
    TEXT_TO_TEXT = "text-to-text",
    VIDEO_TO_TEXT = "video-to-text"
}
export declare const MODEL_CATALOG_TASK_NAME_MAPPING: {
    "audio-to-text": string;
    "image-text-to-text": string;
    "image-to-text": string;
    "text-generation": string;
    "text-to-text": string;
    "video-to-text": string;
};
export declare const MODEL_CATALOG_TASK_DESCRIPTION: {
    "audio-to-text": string;
    "image-text-to-text": string;
    "image-to-text": string;
    "text-generation": string;
    "text-to-text": string;
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
export declare enum ModelCatalogLicense {
    APACHE_2_0 = "apache-2.0",
    GEMMA = "gemma",
    LLLAMA_3_3 = "llama-3.3",
    LLLAMA_3_1 = "llama3.1",
    LLLAMA_3_3_ALTERNATE = "llama3.3",
    LLLAMA_4 = "llama4",
    MIT = "mit",
    MODIFIED_MIT = "modified-mit"
}
export declare const MODEL_CATALOG_LICENSE_NAME_MAPPING: {
    "apache-2.0": string;
    gemma: string;
    "llama-3.3": string;
    "llama3.1": string;
    "llama3.3": string;
    llama4: string;
    mit: string;
    "modified-mit": string;
};
export declare const MODEL_CATALOG_LICENSE_DETAILS: {
    "apache-2.0": {
        name: string;
        type: string;
        description: string;
    };
    gemma: {
        name: string;
        type: string;
        description: string;
    };
    "llama-3.3": {
        name: string;
        type: string;
        description: string;
    };
    "llama3.1": {
        name: string;
        type: string;
        description: string;
    };
    "llama3.3": {
        name: string;
        type: string;
        description: string;
    };
    llama4: {
        name: string;
        type: string;
        description: string;
    };
    mit: {
        name: string;
        type: string;
        description: string;
    };
    "modified-mit": {
        name: string;
        type: string;
        description: string;
    };
};
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
