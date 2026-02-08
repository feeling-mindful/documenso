import type { I18n, Messages } from '@lingui/core';
import { setupI18n } from '@lingui/core';

import {
  APP_I18N_OPTIONS,
  SUPPORTED_LANGUAGE_CODES,
  isValidLanguageCode,
} from '../../constants/i18n';
import { remember } from '../../utils/remember';

type SupportedLanguages = (typeof SUPPORTED_LANGUAGE_CODES)[number];

// Static import map so the bundler can trace these at build time.
const translationLoaders: Record<string, () => Promise<{ messages: Messages }>> = {
  de: async () => import('../../translations/de/web.mjs'),
  en: async () => import('../../translations/en/web.mjs'),
  fr: async () => import('../../translations/fr/web.mjs'),
  es: async () => import('../../translations/es/web.mjs'),
  it: async () => import('../../translations/it/web.mjs'),
  nl: async () => import('../../translations/nl/web.mjs'),
  pl: async () => import('../../translations/pl/web.mjs'),
  'pt-BR': async () => import('../../translations/pt-BR/web.mjs'),
  ja: async () => import('../../translations/ja/web.mjs'),
  ko: async () => import('../../translations/ko/web.mjs'),
  zh: async () => import('../../translations/zh/web.mjs'),
};

export async function loadCatalog(lang: SupportedLanguages): Promise<{
  [k: string]: Messages;
}> {
  const loader = translationLoaders[lang] ?? translationLoaders[APP_I18N_OPTIONS.sourceLang];

  const { messages } = await loader();
  return { [lang]: messages };
}

const catalogs = Promise.all(SUPPORTED_LANGUAGE_CODES.map(loadCatalog));

// transform array of catalogs into a single object
const allMessages = async () => {
  return await catalogs.then((catalogs) =>
    catalogs.reduce((acc, oneCatalog) => {
      return {
        ...acc,
        ...oneCatalog,
      };
    }, {}),
  );
};

type AllI18nInstances = { [K in SupportedLanguages]: I18n };

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const allI18nInstances = remember('i18n.allI18nInstances', async () => {
  const loadedMessages = await allMessages();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return SUPPORTED_LANGUAGE_CODES.reduce((acc, lang) => {
    const messages = loadedMessages[lang] ?? {};

    const i18n = setupI18n({
      locale: lang,
      messages: { [lang]: messages },
    });

    return { ...acc, [lang]: i18n };
  }, {}) as AllI18nInstances;
});

// eslint-disable-next-line @typescript-eslint/ban-types
export const getI18nInstance = async (lang?: SupportedLanguages | (string & {})) => {
  const instances = await allI18nInstances;

  if (!isValidLanguageCode(lang)) {
    return instances[APP_I18N_OPTIONS.sourceLang];
  }

  return instances[lang] ?? instances[APP_I18N_OPTIONS.sourceLang];
};
