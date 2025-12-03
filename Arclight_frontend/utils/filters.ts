// utils/filters.ts

export interface FilterValues {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  shadows: number;
  highlights: number;
  sharpen: number;
}

export const defaultFilterValues: FilterValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  shadows: 0,
  highlights: 0,
  sharpen: 0,
};

/**
 * Convert slider value (-50 to 50) to brightness factor (0 to 2)
 */
export const calculateBrightnessFactor = (value: number): number => {
  return (value + 50) / 50;
};

/**
 * Convert slider value (-50 to 50) to contrast factor (0 to 2)
 */
export const calculateContrastFactor = (value: number): number => {
  return (value + 50) / 50;
};

/**
 * Convert slider value (-50 to 50) to saturation factor (0 to 2)
 */
export const calculateSaturationFactor = (value: number): number => {
  return (value + 50) / 50;
};