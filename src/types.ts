export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  locationName: string;
}

export interface ProductAdvice {
  productName: string;
  category: string;
  currentAction: 'Increase Supply' | 'Maintain Supply' | 'Decrease Supply';
  reason: string;
}

export interface ManufacturingAdvice {
  productName: string;
  forecastAction: 'Scale Up' | 'Steady' | 'Scale Down';
  confidence: number;
  strategicNote: string;
}

export interface MaterialAdvice {
  productName: string;
  rawMaterial: string;
  packagingMaterial: string;
  salesImpactNote: string;
}

export interface SupplyAnalysis {
  currentWeather: WeatherData;
  productRecommendations: ProductAdvice[];
  manufacturingForecast: ManufacturingAdvice[];
  materialStrategy: MaterialAdvice[];
  seasonalOutlook: string;
}
