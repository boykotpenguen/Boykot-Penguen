import { log } from "~util/logger";
import type { Filter } from "~util/types";

/**
 * Scans the page for boycotted domains
 */
export const scanPageForDomains = (domains: Filter[]): Filter[] => {
  if (!domains.length) return [];

  const currentHostname = window.location.hostname.toLowerCase();
  const currentUrl = window.location.href.toLowerCase();

  log("Checking domain:", currentHostname);
  log("Full URL:", currentUrl);

  return domains.filter((domain) => {
    if (!domain.rule) return false;

    // Clean and normalize the domain rule
    // Remove any protocol, www prefix, and trailing slashes to get the base domain
    const domainRule = domain.rule
      .toLowerCase()
      .replace(/^https?:\/\//, "") // Remove protocol
      .replace(/^www\./, "") // Remove www prefix
      .replace(/\/+$/, ""); // Remove trailing slashes

    return (
      currentHostname.endsWith(domainRule) ||
      currentHostname === domainRule ||
      currentUrl.includes(domainRule)
    );
  });
};

/**
 * Text matching for brand detection
 */
const createMatcher = (brands: Filter[]) => {
  const rules = brands.map((brand) => brand.rule.toLowerCase());

  return {
    findMatches: (text: string): Filter[] => {
      const lowerText = text.toLowerCase();
      return brands.filter((_, i) => lowerText.includes(rules[i]));
    }
  };
};

const checkElementForBrands = (
  element: Element,
  matcher: ReturnType<typeof createMatcher>,
  detectedBrands: Set<Filter>
) => {
  const text = element.textContent || "";
  if (text.length > 3) {
    matcher.findMatches(text).forEach((brand) => detectedBrands.add(brand));
  }

  ["alt", "title", "aria-label"].forEach((attr) => {
    const attrValue = element.getAttribute(attr);
    if (attrValue && attrValue.length > 3) {
      matcher
        .findMatches(attrValue)
        .forEach((brand) => detectedBrands.add(brand));
    }
  });
};

/**
 * Progressive scanning strategy for page content
 */
export const scanPageForBrands = (brands: Filter[]): Filter[] => {
  if (!brands.length) return [];

  log("Scanning page for boycotted brands...");

  const matcher = createMatcher(brands);
  const detectedBrands = new Set<Filter>();

  // Phase 1: Check high-value elements first (likely to contain brand info)
  const highValueSelectors = [
    ".product-name",
    ".product-title",
    ".product-brand",
    ".brand",
    '[class*="product"]',
    '[class*="brand"]',
    "h1",
    "h2",
    "title",
    "meta[property='og:title']",
    "meta[name='keywords']"
  ];

  const highValueElements = document.querySelectorAll(
    highValueSelectors.join(",")
  );
  log(`Checking ${highValueElements.length} high-value elements`);

  highValueElements.forEach((element) =>
    checkElementForBrands(element, matcher, detectedBrands)
  );

  // If we found matches, return them without further scanning
  if (detectedBrands.size > 0) {
    return Array.from(detectedBrands);
  }

  // Phase 2: Check main content areas
  const contentSelectors = [
    "main",
    "article",
    ".content",
    "#content",
    ".product-description",
    ".description",
    ".details"
  ];

  const contentElements = document.querySelectorAll(contentSelectors.join(","));
  log(`Checking ${contentElements.length} content elements`);

  contentElements.forEach((element) => {
    const text = element.textContent || "";
    if (text.length > 10) {
      matcher.findMatches(text).forEach((brand) => detectedBrands.add(brand));
    }
  });

  // If we have matches now, return them
  if (detectedBrands.size > 0) {
    return Array.from(detectedBrands);
  }

  // Phase 3: If still no matches, check visible body text
  // This is more efficient than checking the entire body
  const visibleTextElements = Array.from(
    document.querySelectorAll("p, span, div")
  ).filter((el) => {
    const rect = el.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    );
  });

  log(`Checking ${visibleTextElements.length} visible text elements`);

  visibleTextElements.forEach((element) => {
    const text = element.textContent || "";
    if (text.length > 10) {
      matcher.findMatches(text).forEach((brand) => detectedBrands.add(brand));
    }
  });

  return Array.from(detectedBrands);
};

/**
 * Deep scan that's more performance-friendly
 */
export const deepScanForBrands = (brands: Filter[]): Filter[] => {
  if (!brands.length) return [];

  const matcher = createMatcher(brands);
  const detectedBrands = new Set<Filter>();

  // Use a more focused approach instead of checking every element
  // 1. Get all text nodes in the document
  const textNodes: Text[] = [];
  const treeWalker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Filter out empty or very short text nodes
        const text = node.textContent?.trim() || "";
        return text.length > 5
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    }
  );

  // Limit the number of nodes we process for performance
  let count = 0;
  const MAX_NODES = 1000;

  while (treeWalker.nextNode() && count < MAX_NODES) {
    textNodes.push(treeWalker.currentNode as Text);
    count++;
  }

  log(`Deep scanning ${textNodes.length} text nodes`);

  // Process in batches to avoid blocking the main thread
  const BATCH_SIZE = 100;
  const processBatch = (startIndex: number) => {
    const endIndex = Math.min(startIndex + BATCH_SIZE, textNodes.length);

    for (let i = startIndex; i < endIndex; i++) {
      const text = textNodes[i].textContent || "";
      matcher.findMatches(text).forEach((brand) => detectedBrands.add(brand));
    }

    // If we have more batches and still no matches, continue
    if (endIndex < textNodes.length && detectedBrands.size === 0) {
      setTimeout(() => processBatch(endIndex), 0);
    }
  };

  processBatch(0);

  return Array.from(detectedBrands);
};
