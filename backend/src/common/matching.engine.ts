import { Injectable, Logger } from '@nestjs/common';
import { distance as levenshtein } from 'fastest-levenshtein';

interface MatchScore {
  score: number;
  method: string;
}

interface ProductCandidate {
  id: string;
  nameEn: string;
  nameAr?: string;
  normalizedTokens?: string[];
  brand?: string;
}

@Injectable()
export class MatchingEngine {
  private readonly logger = new Logger(MatchingEngine.name);

  // Normalize product name for matching
  normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[''""]/g, '"')
      .replace(/[^\w\s\u0600-\u06FF"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract tokens with importance weights
  tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    const tokens = normalized.split(' ').filter((t) => t.length > 1);
    
    // Remove very common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for',
      'with', 'by', 'from', 'of', 'is', 'are', 'was', 'be',
      'smart', 'new', 'best', 'top', 'official',
    ]);
    
    return tokens.filter((t) => !stopWords.has(t));
  }

  // Extract key attributes from product name
  extractAttributes(name: string): Record<string, string | null> {
    const normalized = name.toLowerCase();
    
    // Size/inch detection
    const sizeMatch = normalized.match(/(\d+)\s*(?:inch|"|''|in\b)/);
    const size = sizeMatch ? sizeMatch[1] : null;

    // Storage detection
    const storageMatch = normalized.match(/(\d+)\s*(?:gb|tb)/);
    const storage = storageMatch ? storageMatch[0] : null;

    // RAM detection
    const ramMatch = normalized.match(/(\d+)\s*gb\s+ram/);
    const ram = ramMatch ? ramMatch[0] : null;

    // Model number detection (alphanumeric sequences)
    const modelMatch = normalized.match(/\b([a-z]+\d+[a-z\d]*|\d+[a-z]+\d*)\b/g);
    const model = modelMatch ? modelMatch[0] : null;

    // Resolution/quality
    const resolution = normalized.match(/\b(4k|8k|fhd|hd|uhd|qhd|amoled|oled|qled)\b/)?.[0] || null;

    // Brand extraction (common brands)
    const brands = [
      'samsung', 'apple', 'lg', 'sony', 'xiaomi', 'huawei', 'oppo', 'vivo',
      'oneplus', 'nokia', 'lenovo', 'hp', 'dell', 'asus', 'acer', 'msi',
      'panasonic', 'toshiba', 'sharp', 'philips', 'hisense', 'tcl',
      'dyson', 'bosch', 'siemens', 'whirlpool', 'midea', 'haier',
    ];
    const brand = brands.find((b) => normalized.includes(b)) || null;

    return { size, storage, ram, model, resolution, brand };
  }

  // Token Jaccard similarity
  tokenSimilarity(tokensA: string[], tokensB: string[]): number {
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    const intersection = [...setA].filter((t) => setB.has(t));
    const union = new Set([...setA, ...setB]);
    return intersection.length / union.size;
  }

  // Levenshtein similarity (normalized to 0-1)
  stringSimilarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    const dist = levenshtein(a, b);
    return 1 - dist / maxLen;
  }

  // Attribute match score
  attributeScore(attrsA: Record<string, string | null>, attrsB: Record<string, string | null>): number {
    const keys = ['brand', 'model', 'size', 'storage', 'resolution'];
    let matches = 0;
    let conflicts = 0;
    let checked = 0;

    for (const key of keys) {
      const a = attrsA[key];
      const b = attrsB[key];
      if (a && b) {
        checked++;
        if (a === b) matches++;
        else conflicts++;
      }
    }

    if (checked === 0) return 0.5; // No info to compare
    if (conflicts > 0) return 0; // Hard mismatch (different model/size)
    return matches / Math.max(checked, 1);
  }

  // Main matching function
  computeMatchScore(nameA: string, nameB: string): MatchScore {
    const tokensA = this.tokenize(nameA);
    const tokensB = this.tokenize(nameB);
    const attrsA = this.extractAttributes(nameA);
    const attrsB = this.extractAttributes(nameB);

    // Hard block: different brands
    if (attrsA.brand && attrsB.brand && attrsA.brand !== attrsB.brand) {
      return { score: 0, method: 'brand_mismatch' };
    }

    const attrScore = this.attributeScore(attrsA, attrsB);
    
    // Hard block: critical attribute mismatch (different size, model etc.)
    if (attrScore === 0 && (attrsA.size || attrsA.model) && (attrsB.size || attrsB.model)) {
      return { score: 0, method: 'attribute_mismatch' };
    }

    const tokenSim = this.tokenSimilarity(tokensA, tokensB);
    const normA = this.normalize(nameA);
    const normB = this.normalize(nameB);
    const strSim = this.stringSimilarity(normA, normB);

    // Weighted combination
    const score = tokenSim * 0.5 + strSim * 0.2 + attrScore * 0.3;

    return {
      score: Math.min(1, score),
      method: 'combined',
    };
  }

  // Find best match from candidates
  findBestMatch(
    newProduct: { name: string; brand?: string },
    candidates: ProductCandidate[],
    threshold = 0.72,
  ): { match: ProductCandidate | null; score: number } {
    let bestScore = 0;
    let bestMatch: ProductCandidate | null = null;

    for (const candidate of candidates) {
      const { score } = this.computeMatchScore(newProduct.name, candidate.nameEn);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestScore >= threshold) {
      this.logger.debug(`Matched "${newProduct.name}" → "${bestMatch?.nameEn}" (score: ${bestScore.toFixed(3)})`);
      return { match: bestMatch, score: bestScore };
    }

    return { match: null, score: bestScore };
  }

  // Generate slug from product name
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 250);
  }

  // Extract brand from name for DB lookup
  extractBrand(name: string): string | null {
    const attrs = this.extractAttributes(name);
    return attrs.brand;
  }
}
