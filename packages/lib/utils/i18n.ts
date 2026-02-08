import type { I18n, MessageDescriptor } from '@lingui/core';
import { i18n } from '@lingui/core';
import type { MacroMessageDescriptor } from '@lingui/core/macro';

import type { I18nLocaleData, SupportedLanguageCodes } from '../constants/i18n';
import { APP_I18N_OPTIONS } from '../constants/i18n';

// Static import map so the bundler can trace these at build time.
// Dynamic template-literal imports (e.g. `../translations/${locale}/web.mjs`)
// are invisible to Vercel's bundler and get excluded from the serverless function.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translationLoaders: Record<string, () => Promise<{ messages: any }>> = {
  de: async () => import('../translations/de/web.mjs'),
  en: async () => import('../translations/en/web.mjs'),
  fr: async () => import('../translations/fr/web.mjs'),
  es: async () => import('../translations/es/web.mjs'),
  it: async () => import('../translations/it/web.mjs'),
  nl: async () => import('../translations/nl/web.mjs'),
  pl: async () => import('../translations/pl/web.mjs'),
  'pt-BR': async () => import('../translations/pt-BR/web.mjs'),
  ja: async () => import('../translations/ja/web.mjs'),
  ko: async () => import('../translations/ko/web.mjs'),
  zh: async () => import('../translations/zh/web.mjs'),
};

export async function getTranslations(locale: string) {
  const loader = translationLoaders[locale];

  if (!loader) {
    const fallback = translationLoaders[APP_I18N_OPTIONS.sourceLang];
    const { messages } = await fallback();
    return messages;
  }

  const { messages } = await loader();
  return messages;
}

export async function dynamicActivate(locale: string) {
  const messages = await getTranslations(locale);

  i18n.loadAndActivate({ locale, messages });
}

const parseLanguageFromLocale = (locale: string): SupportedLanguageCodes | null => {
  const [language, _country] = locale.split('-');

  const foundSupportedLanguage = APP_I18N_OPTIONS.supportedLangs.find(
    (lang): lang is SupportedLanguageCodes => lang === language,
  );

  if (!foundSupportedLanguage) {
    return null;
  }

  return foundSupportedLanguage;
};

/**
 * Extracts the language from the `accept-language` header.
 */
export const extractLocaleDataFromHeaders = (
  headers: Headers,
): { lang: SupportedLanguageCodes | null; locales: string[] } => {
  const headerLocales = (headers.get('accept-language') ?? '').split(',');

  const language = parseLanguageFromLocale(headerLocales[0]);

  return {
    lang: language,
    locales: [headerLocales[0]],
  };
};

type ExtractLocaleDataOptions = {
  headers: Headers;
};

/**
 * Extract the supported language from the header.
 *
 * Will return the default fallback language if not found.
 */
export const extractLocaleData = ({ headers }: ExtractLocaleDataOptions): I18nLocaleData => {
  const headerLocales = (headers.get('accept-language') ?? '').split(',');

  const unknownLanguages = headerLocales
    .map((locale) => parseLanguageFromLocale(locale))
    .filter((value): value is SupportedLanguageCodes => value !== null);

  // Filter out locales that are not valid.
  const languages = (unknownLanguages ?? []).filter((language) => {
    try {
      new Intl.Locale(language);
      return true;
    } catch {
      return false;
    }
  });

  return {
    lang: languages[0] || APP_I18N_OPTIONS.sourceLang,
    locales: headerLocales,
  };
};

export const parseMessageDescriptor = (_: I18n['_'], value: string | MessageDescriptor) => {
  return typeof value === 'string' ? value : _(value);
};

export const parseMessageDescriptorMacro = (
  t: (descriptor: MacroMessageDescriptor) => string,
  value: string | MessageDescriptor,
) => {
  return typeof value === 'string' ? value : t(value);
};
