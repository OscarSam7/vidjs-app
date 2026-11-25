import { Locale } from "./types";
import { PHRASE_MAP } from "./dictionaries";

const originalTextMap = new WeakMap<Text, string>();
const originalAttrMap = new WeakMap<Element, Record<string, string>>();
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG"]);
const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label"] as const;

// Patrones dinámicos frecuentes (con números o nombres embebidos)
const DYNAMIC_PATTERNS: Array<{
  regex: RegExp;
  pt: (...args: string[]) => string;
  en: (...args: string[]) => string;
}> = [
  {
    regex: /^Paso 2: Elige tu mesa \((\d+) disponibles?\)$/i,
    pt: (_, n) => `Passo 2: Escolha sua mesa (${n} ${Number(n) === 1 ? "disponível" : "disponíveis"})`,
    en: (_, n) => `Step 2: Choose your table (${n} available)`,
  },
  {
    regex: /^Mesas Disponibles \((\d+)\)$/i,
    pt: (_, n) => `Mesas Disponíveis (${n})`,
    en: (_, n) => `Available Tables (${n})`,
  },
  {
    regex: /^Todos \((\d+)\)$/i,
    pt: (_, n) => `Todos (${n})`,
    en: (_, n) => `All (${n})`,
  },
  {
    regex: /^Calificar a (.+)$/i,
    pt: (_, name) => `Avaliar ${name}`,
    en: (_, name) => `Rate ${name}`,
  },
  {
    regex: /^Cargando mesas de (.+)\.\.\.$/i,
    pt: (_, name) => `Carregando mesas de ${name}...`,
    en: (_, name) => `Loading tables for ${name}...`,
  },
  {
    regex: /^Hasta (.+)$/i,
    pt: (_, time) => `Até ${time}`,
    en: (_, time) => `Until ${time}`,
  },
  {
    regex: /^© (\d{4}) (.+) Todos los derechos reservados\.$/i,
    pt: (_, year, brand) => `© ${year} ${brand} Todos os direitos reservados.`,
    en: (_, year, brand) => `© ${year} ${brand} All rights reserved.`,
  },
  {
    regex: /^Mis Entradas \((\d+)\)$/i,
    pt: (_, n) => `Meus Ingressos (${n})`,
    en: (_, n) => `My Tickets (${n})`,
  },
];

// Índice case-insensitive para coincidencias rápidas
const LOWER_PHRASE_MAP = new Map<string, { pt: string; en: string }>();
for (const [esText, translations] of Object.entries(PHRASE_MAP)) {
  LOWER_PHRASE_MAP.set(esText.trim().toLowerCase(), translations);
}

export function translatePhrase(rawText: string, locale: Locale): string {
  if (locale === "es") return rawText;
  const trimmed = rawText.trim();
  if (!trimmed || trimmed.length < 2) return rawText;

  // 1. Coincidencia exacta
  const exact = PHRASE_MAP[trimmed];
  if (exact) {
    return rawText.replace(trimmed, exact[locale]);
  }

  // 2. Coincidencia sin distinguir mayúsculas
  const lower = LOWER_PHRASE_MAP.get(trimmed.toLowerCase());
  if (lower) {
    return rawText.replace(trimmed, lower[locale]);
  }

  // 3. Patrones dinámicos
  for (const pattern of DYNAMIC_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const translated = locale === "pt" ? pattern.pt(...match) : pattern.en(...match);
      return rawText.replace(trimmed, translated);
    }
  }

  return rawText;
}

function shouldSkipElement(el: Element | null): boolean {
  let curr: Element | null = el;
  while (curr) {
    if (SKIP_TAGS.has(curr.tagName)) return true;
    if (curr.getAttribute("data-no-translate") === "true") return true;
    curr = curr.parentElement;
  }
  return false;
}

function processTextNode(node: Text, locale: Locale) {
  if (shouldSkipElement(node.parentElement)) return;
  const current = node.nodeValue || "";
  if (!current.trim()) return;

  if (locale === "es") {
    const orig = originalTextMap.get(node);
    if (orig !== undefined && current !== orig) {
      node.nodeValue = orig;
    }
    return;
  }

  // Guardar el original español la primera vez (o si React actualizó el texto)
  if (!originalTextMap.has(node)) {
    originalTextMap.set(node, current);
  }
  const source = originalTextMap.get(node) || current;
  const translated = translatePhrase(source, locale);
  if (translated !== current) {
    node.nodeValue = translated;
  }
}

function processElementAttrs(el: Element, locale: Locale) {
  if (shouldSkipElement(el)) return;

  for (const attr of TRANSLATABLE_ATTRS) {
    const val = el.getAttribute(attr);
    if (!val || !val.trim()) continue;

    let saved = originalAttrMap.get(el);
    if (locale === "es") {
      if (saved && saved[attr] !== undefined && val !== saved[attr]) {
        el.setAttribute(attr, saved[attr]);
      }
      continue;
    }

    if (!saved) {
      saved = {};
      originalAttrMap.set(el, saved);
    }
    if (saved[attr] === undefined) {
      saved[attr] = val;
    }

    const translated = translatePhrase(saved[attr], locale);
    if (translated !== val) {
      el.setAttribute(attr, translated);
    }
  }
}

export function applyDomTranslation(root: Node, locale: Locale) {
  if (typeof document === "undefined") return;

  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(root as Text, locale);
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (shouldSkipElement(el)) return;
    processElementAttrs(el, locale);
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  );

  let currentNode: Node | null = walker.nextNode();
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      processTextNode(currentNode as Text, locale);
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      processElementAttrs(currentNode as Element, locale);
    }
    currentNode = walker.nextNode();
  }
}
