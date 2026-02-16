
export type ItemStatus = 'analyzing' | 'error' | 'complete';
export type UnitCategory = 'weight' | 'volume' | 'count';

export interface GroceryItem {
  id: string;
  imageUrl: string;
  status: ItemStatus;
  name?: string;
  brand?: string;
  price?: number;
  quantity?: number;
  unit?: string;
  category?: UnitCategory;
  errorReason?: string;
  // Metadata for normalized calculation
  normalizedRates?: {
    [key: string]: number; // key e.g. "100g", "1kg", etc.
  };
}

export interface AnalysisResponse {
  name: string;
  brand: string;
  price: number;
  quantity: number;
  unit: string;
  category: UnitCategory;
}

export type GlobalComparisonUnit = 'small' | 'large' | 'individual';
// small: 100g/ml
// large: 1kg/L
// individual: per 1 unit
