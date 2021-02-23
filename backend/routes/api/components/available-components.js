module.exports = [
  {
    id: 'anaconde-ce',
    label: 'Anaconda Commercial Edition',
    provider: 'Anaconda',
    description: `Anaconda Commercial Edition is the world's most popular open-source package 
       distribution and management experience, backed by a premium repository optimized and
       supported for commercial use.`,
    kfdefApplications: [], // ??
    route: '', // ??
    endpoint: '', // ??
    img: 'images/anacondda-ce.svg', // need an svg version of the logo
    support: 'other',
    partner: '3rd party support',
    docsLink: 'https://docs.anaconda.com/',
    installFile: '', // ??  Very long web page, not easily converted to MD.
    quickStart: '', // ?? this is generated in a YAML format specific to our Quick Start format.
  },
  {
    id: 'startburst',
    label: 'Starburst Enterprse',
    provider: 'Starburst',
    description: `Starburst Enterprise unlocks the value of all data by making it fast and easy to
      access anywhere. Starburst queries data across any database, making it instantly actionable for
      organizations. Teams can lower the total cost of their infrastructure and analytics
      investments, prevent vendor lock-in, and use the tools that work best for their business.`,
    kfdefApplications: [], // ??
    route: '', // ??
    endpoint: '', // ??
    img: 'images/starburst.svg', // need an svg version of the logo
    support: 'other',
    partner: '3rd party support',
    docsLink: 'https://docs.starburst.com/',
    installFile: '', // ??  Very long web page, not easily converted to MD.
    quickStart: '', // ?? this is generated in a YAML format specific to our Quick Start format.
  },
  {
    id: 'perceptiLabs',
    label: 'Percepti Labs',
    provider: 'Starburst',
    description: `PerceptiLabs is aimed at accelerating machine learning by streamlining the
      workflow and advancing explainability of the models. To do this, PerceptiLabs created a visual
      modeling tool which gives full transparency into the process of machine learning development,
      combined with support functions for debugging and increased interpretability into the models.`,
    kfdefApplications: [], // ??
    route: '', // ??
    endpoint: '', // ??
    img: 'images/percepti-labs.svg', // need an svg version of the logo
    support: 'other',
    partner: 'Coming soon',
    docsLink: 'https://docs.starburst.com/',
    installFile: '', // ??  Very long web page, not easily converted to MD.
    quickStart: '', // ?? this is generated in a YAML format specific to our Quick Start format.
  },
  {
    id: 'seldon',
    label: 'Seldon Deploy',
    provider: 'Seldon',
    description: `Seldon Deploy is a specialist set of tools designed to simplify and accelerate the
      process of deploying and managing your machine learning models. Seldon Deploy bridges the gap
      between your data science and DevOps teams so you can bring models to market faster.`,
    kfdefApplications: ['odhseldon'],
    route: null,
    img: 'images/seldon.svg',
    docsLink: 'https://docs.seldon.io/',
    support: 'third party',
    partner: '3rd party support',
  },
];
