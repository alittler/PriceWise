
import { UnitCategory } from '../types';

export interface NormalizedData {
  rates: Record<string, number>;
  category: UnitCategory;
  baseUnit: string;
}

export const getNormalizedData = (price: number, quantity: number, unit: string): NormalizedData => {
  const u = unit.toLowerCase().trim();
  let weightInGrams: number | null = null;
  let volumeInMl: number | null = null;
  let count: number | null = null;

  // Weight normalization
  if (['g', 'gram', 'grams'].includes(u)) weightInGrams = quantity;
  else if (['kg', 'kilogram', 'kilograms', 'kilo'].includes(u)) weightInGrams = quantity * 1000;
  else if (['oz', 'ounce', 'ounces'].includes(u)) weightInGrams = quantity * 28.3495;
  else if (['lb', 'lbs', 'pound', 'pounds'].includes(u)) weightInGrams = quantity * 453.592;

  // Volume normalization
  else if (['ml', 'milliliter', 'milliliters'].includes(u)) volumeInMl = quantity;
  else if (['l', 'liter', 'liters', 'litre'].includes(u)) volumeInMl = quantity * 1000;
  else if (['fl oz', 'floz', 'fluid ounce'].includes(u)) volumeInMl = quantity * 29.5735;

  // Count normalization
  else count = quantity;

  if (weightInGrams !== null) {
    return {
      category: 'weight',
      baseUnit: 'G',
      rates: {
        '100G': (price / weightInGrams) * 100,
        '1KG': (price / weightInGrams) * 1000,
        '1LB': (price / weightInGrams) * 453.592,
      }
    };
  }

  if (volumeInMl !== null) {
    return {
      category: 'volume',
      baseUnit: 'ML',
      rates: {
        '100ML': (price / volumeInMl) * 100,
        '1L': (price / volumeInMl) * 1000,
        'FL OZ': (price / volumeInMl) * 29.5735,
      }
    };
  }

  return {
    category: 'count',
    baseUnit: 'UNIT',
    rates: {
      'UNIT': price / (count || 1),
      'DOZEN': (price / (count || 1)) * 12,
    }
  };
};

export const getDisplayRate = (rates: Record<string, number>, scale: 'small' | 'large' | 'individual', category: UnitCategory) => {
  if (category === 'weight') {
    if (scale === 'large') return { rate: rates['1KG'], label: '1KG' };
    return { rate: rates['100G'], label: '100G' };
  }
  if (category === 'volume') {
    if (scale === 'large') return { rate: rates['1L'], label: '1L' };
    return { rate: rates['100ML'], label: '100ML' };
  }
  return { rate: rates['UNIT'], label: 'UNIT' };
};
