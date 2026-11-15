import { DemoBadge } from './DemoBadge';
import React, { useState, useMemo } from 'react';
import { FarmLocation, FarmProfile } from '../types';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  Wind, 
  Droplets, 
  Thermometer, 
  Gauge, 
  Compass, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface WeatherViewProps {
  farmProfile: FarmProfile;
  onChangeFarmLocation?: (preset: FarmLocation) => void;
  onOpenEditLocation?: () => void;
  lang: 'es' | 'en';
}

interface HourlyForecast {
  time: string;
  temp: number;
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'storm';
  condition: string;
  pop: number; // Probability of precipitation (%)
  windSpeed: number; // km/h
}

interface DailyForecast {
  day: string;
  date: string;
  tempMin: number;
  tempMax: number;
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'storm';
  condition: string;
  pop: number; // %
  rainMm: number;
  windSpeed: number; // km/h
  windDir: string;
  humidity: number;
  et0: number; // mm/day
  agriRecommendation: string;
  agriStatus: 'good' | 'warning' | 'alert';
}

interface RegionalWeatherProfile {
  currentTemp: number;
  apparentTemp: number;
  tempMinToday: number;
  tempMaxToday: number;
  humidity: number;
  dewPoint: number;
  windSpeed: number;
  windGusts: number;
  windDirection: string;
  windDeg: number;
  pressure: number;
  pressureTrend: 'stable' | 'falling' | 'rising';
  popToday: number;
  rainAccumulatedToday: number;
  uvIndex: number;
  solarRadiation: number; // W/m²
  et0Today: number; // mm/day
  soilMoistureIndex: string; // e.g. 68% Capacidad de Campo
  skyCondition: string;
  spraySuitability: 'optimal' | 'moderate' | 'unfavorable';
  sprayReason: string;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

export const WeatherView: React.FC<WeatherViewProps> = ({
  farmProfile,
  onChangeFarmLocation,
  onOpenEditLocation,
  lang
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  // Generate province/region realistic weather profile
  const weatherData: RegionalWeatherProfile = useMemo(() => {
    const province = farmProfile.location.province.toLowerCase();

    if (province.includes('chaco') || province.includes('formosa')) {
      return {
        currentTemp: 31,
        apparentTemp: 34,
        tempMinToday: 21,
        tempMaxToday: 35,
        humidity: 52,
        dewPoint: 20,
        windSpeed: 18,
        windGusts: 28,
        windDirection: 'NNE',
        windDeg: 25,
        pressure: 1011,
        pressureTrend: 'stable',
        popToday: 15,
        rainAccumulatedToday: 0,
        uvIndex: 9,
        solarRadiation: 890,
        et0Today: 5.6,
        soilMoistureIndex: '34% (Déficit hídrico en primeros 20cm)',
        skyCondition: lang === 'es' ? 'Despejado con ambiente cálido' : 'Clear and hot weather',
        spraySuitability: 'moderate',
        sprayReason: lang === 'es' ? 'Viento en límite y alta evaporación (temperatura > 30°C)' : 'High evaporation rate and wind near limit',
        hourly: [
          { time: '08:00', temp: 23, icon: 'sun', condition: lang === 'es' ? 'Despejado' : 'Clear', pop: 0, windSpeed: 12 },
          { time: '11:00', temp: 28, icon: 'sun', condition: lang === 'es' ? 'Sol radiante' : 'Sunny', pop: 5, windSpeed: 16 },
          { time: '14:00', temp: 34, icon: 'cloud-sun', condition: lang === 'es' ? 'Caluroso' : 'Hot', pop: 15, windSpeed: 20 },
          { time: '17:00', temp: 32, icon: 'cloud-sun', condition: lang === 'es' ? 'Algo nublado' : 'Partly cloudy', pop: 20, windSpeed: 18 },
          { time: '20:00', temp: 27, icon: 'cloud', condition: lang === 'es' ? 'Templado' : 'Warm evening', pop: 10, windSpeed: 14 },
          { time: '23:00', temp: 24, icon: 'sun', condition: lang === 'es' ? 'Cielo limpio' : 'Clear', pop: 0, windSpeed: 11 },
        ],
        daily: [
          {
            day: lang === 'es' ? 'Hoy' : 'Today',
            date: '19 Sep',
            tempMin: 21,
            tempMax: 35,
            icon: 'sun',
            condition: lang === 'es' ? 'Despejado y caluroso' : 'Sunny & hot',
            pop: 15,
            rainMm: 0,
            windSpeed: 18,
            windDir: 'NNE',
            humidity: 52,
            et0: 5.6,
            agriRecommendation: lang === 'es' ? 'Evitar aplicaciones agroquímicas entre las 11:00 y las 16:30 por deriva térmica.' : 'Avoid chemical spraying from 11:00 to 16:30 due to thermal draft.',
            agriStatus: 'warning'
          },
          {
            day: lang === 'es' ? 'Dom' : 'Sun',
            date: '20 Sep',
            tempMin: 22,
            tempMax: 36,
            icon: 'cloud-sun',
            condition: lang === 'es' ? 'Muy caluroso con viento N' : 'Very hot with N wind',
            pop: 20,
            rainMm: 0,
            windSpeed: 22,
            windDir: 'N',
            humidity: 48,
            et0: 6.1,
            agriRecommendation: lang === 'es' ? 'Riesgo de marchitez temporal en cultivos de verano sin cobertura densa.' : 'Risk of temporary wilting in summer crops without dense residue cover.',
            agriStatus: 'warning'
          },
          {
            day: lang === 'es' ? 'Lun' : 'Mon',
            date: '21 Sep',
            tempMin: 20,
            tempMax: 29,
            icon: 'storm',
            condition: lang === 'es' ? 'Tormentas aisladas de frente sur' : 'Isolated storms / south front',
            pop: 75,
            rainMm: 22,
            windSpeed: 30,
            windDir: 'S',
            humidity: 78,
            et0: 3.2,
            agriRecommendation: lang === 'es' ? 'Lluvias favorables para recarga de humedad en lotes para siembra de girasol.' : 'Rainfall favorable for soil moisture recharge ahead of sunflower planting.',
            agriStatus: 'good'
          },
          {
            day: lang === 'es' ? 'Mar' : 'Tue',
            date: '22 Sep',
            tempMin: 16,
            tempMax: 25,
            icon: 'cloud-sun',
            condition: lang === 'es' ? 'Mejorando con brisa fresca del sur' : 'Improving with fresh south breeze',
            pop: 10,
            rainMm: 0,
            windSpeed: 16,
            windDir: 'SSE',
            humidity: 60,
            et0: 3.8,
            agriRecommendation: lang === 'es' ? 'Ventana óptima para labores mecánicas y siembra tras el oreo del suelo.' : 'Optimal window for field operations and planting once soil dries.',
            agriStatus: 'good'
          },
          {
            day: lang === 'es' ? 'Mié' : 'Wed',
            date: '23 Sep',
            tempMin: 15,
            tempMax: 27,
            icon: 'sun',
            condition: lang === 'es' ? 'Soleado y templado' : 'Sunny & pleasant',
            pop: 5,
            rainMm: 0,
            windSpeed: 12,
            windDir: 'E',
            humidity: 55,
            et0: 4.2,
            agriRecommendation: lang === 'es' ? 'Condiciones excelentes para pulverización matutina (viento calmo, baja evap). ' : 'Excellent conditions for morning spraying (calm wind, low evap).',
            agriStatus: 'good'
          },
          {
            day: lang === 'es' ? 'Jue' : 'Thu',
            date: '24 Sep',
            tempMin: 17,
            tempMax: 30,
            icon: 'sun',
            condition: lang === 'es' ? 'Ascenso térmico gradual' : 'Gradual temperature rise',
            pop: 10,
            rainMm: 0,
            windSpeed: 15,
            windDir: 'ENE',
            humidity: 50,
            et0: 4.9,
            agriRecommendation: lang === 'es' ? 'Monitorear reservas hídricas en profundidad con radar SAR SAOCOM.' : 'Monitor subsoil water reserves with SAR SAOCOM telemetry.',
            agriStatus: 'good'
          },
          {
            day: lang === 'es' ? 'Vie' : 'Fri',
            date: '25 Sep',
            tempMin: 19,
            tempMax: 32,
            icon: 'cloud-sun',
            condition: lang === 'es' ? 'Caluroso y estable' : 'Warm and steady',
            pop: 20,
            rainMm: 0,
            windSpeed: 17,
            windDir: 'N',
            humidity: 54,
            et0: 5.3,
            agriRecommendation: lang === 'es' ? 'Mantener rastrojo en superficie para retener milímetros ganados.' : 'Maintain surface stubble to conserve recharged millimeters.',
            agriStatus: 'good'
          }
        ]
      };
    }

    if (province.includes('chubut') || province.includes('santa cruz') || province.includes('río negro')) {
      return {
        currentTemp: 13,
        apparentTemp: 10,
        tempMinToday: 4,
        tempMaxToday: 15,
        humidity: 44,
        dewPoint: 2,
        windSpeed: 38,
        windGusts: 58,
        windDirection: 'WSW',
        windDeg: 245,
        pressure: 1006,
        pressureTrend: 'falling',
        popToday: 10,
        rainAccumulatedToday: 0,
        uvIndex: 4,
        solarRadiation: 540,
        et0Today: 4.1,
        soilMoistureIndex: '28% (Riesgo de desecación eólica)',
        skyCondition: lang === 'es' ? 'Parcialmente nublado con viento intenso' : 'Partly cloudy with strong winds',
        spraySuitability: 'unfavorable',
        sprayReason: lang === 'es' ? 'Prohibido pulverizar: ráfagas superan los 45 km/h (deriva extrema)' : 'Spray prohibited: wind gusts exceed 45 km/h (severe drift risk)',
        hourly: [
          { time: '08:00', temp: 5, icon: 'sun', condition: lang === 'es' ? 'Frío matinal' : 'Cold morning', pop: 0, windSpeed: 24 },
          { time: '11:00', temp: 10, icon: 'cloud-sun', condition: lang === 'es' ? 'Ventoso' : 'Breezy', pop: 0, windSpeed: 34 },
          { time: '14:00', temp: 15, icon: 'cloud-sun', condition: lang === 'es' ? 'Ráfagas fuertes' : 'High gusts', pop: 10, windSpeed: 42 },
          { time: '17:00', temp: 13, icon: 'cloud', condition: lang === 'es' ? 'Mayormente nublado' : 'Cloudy', pop: 15, windSpeed: 38 },
          { time: '20:00', temp: 9, icon: 'cloud', condition: lang === 'es' ? 'Descenso de temp' : 'Chilly', pop: 10, windSpeed: 28 },
          { time: '23:00', temp: 6, icon: 'sun', condition: lang === 'es' ? 'Cielo despejado' : 'Clear & cold', pop: 0, windSpeed: 20 },
        ],
        daily: [
          {
            day: lang === 'es' ? 'Hoy' : 'Today',
            date: '19 Sep',
            tempMin: 4,
            tempMax: 15,
            icon: 'cloud-sun',
            condition: lang === 'es' ? 'Muy ventoso' : 'Very windy',
            pop: 10,
            rainMm: 0,
            windSpeed: 38,
            windDir: 'WSW',
            humidity: 44,
            et0: 4.1,
            agriRecommendation: lang === 'es' ? 'Suspender cualquier pulverización; proteger cortinas forestales y verificar riego por goteo.' : 'Suspend all spraying; protect windbreaks and inspect drip irrigation.',
            agriStatus: 'alert'
          },
          {
            day: lang === 'es' ? 'Dom' : 'Sun',
            date: '20 Sep',
            tempMin: 2,
            tempMax: 14,
            icon: 'sun',
            condition: lang === 'es' ? 'Riesgo de helada matinal' : 'Frost risk at dawn',
            pop: 0,
            rainMm: 0,
            windSpeed: 18,
            windDir: 'SW',
            humidity: 50,
            et0: 3.2,
            agriRecommendation: lang === 'es' ? 'Alerta por helada tardía (2°C a 1.5m). Activar aspersores antihelada en frutales.' : 'Late frost alert (2°C at shelter). Activate anti-frost sprinklers on orchards.',
            agriStatus: 'warning'
          },
          {
            day: lang === 'es' ? 'Lun' : 'Mon',
            date: '21 Sep',
            tempMin: 5,
            tempMax: 17,
            icon: 'sun',
            condition: lang === 'es' ? 'Despejado y templado' : 'Clear & mild',
            pop: 0,
            rainMm: 0,
            windSpeed: 22,
            windDir: 'W',
            humidity: 46,
            et0: 3.7,
            agriRecommendation: lang === 'es' ? 'Ventana de trabajo adecuada en primeras horas de la mañana.' : 'Suitable field operations window during early morning hours.',
            agriStatus: 'good'
          },
          {
            day: lang === 'es' ? 'Mar' : 'Tue',
            date: '22 Sep',
            tempMin: 7,
            tempMax: 18,
            icon: 'cloud-sun',
            condition: lang === 'es' ? 'Agradable con sol' : 'Pleasant & sunny',
            pop: 10,
            rainMm: 0,
            windSpeed: 25,
            windDir: 'WNW',
            humidity: 48,
            et0: 3.9,
            agriRecommendation: lang === 'es' ? 'Buenas condiciones para pastoreo rotativo y corte de alfalfa bajo riego.' : 'Good conditions for rotational grazing and alfalfa cutting under irrigation.',
            agriStatus: 'good'
          },
          {
            day: lang === 'es' ? 'Mié' : 'Wed',
            date: '23 Sep',
            tempMin: 6,
            tempMax: 16,
            icon: 'cloud',
            condition: lang === 'es' ? 'Nubosidad en aumento' : 'Increasing clouds',
            pop: 25,
            rainMm: 1,
            windSpeed: 30,
            windDir: 'NW',
            humidity: 55,
            et0: 3.4,
            agriRecommendation: lang === 'es' ? 'Régimen de vientos moderado a fuerte en horas de la tarde.' : 'Moderate to strong wind regime expected during afternoon hours.',
            agriStatus: 'warning'
          },
          {
            day: lang === 'es' ? 'Jue' : 'Thu',
            date: '24 Sep',
            tempMin: 3,
            tempMax: 13,
            icon: 'rain',
            condition: lang === 'es' ? 'Chaparrones aislados fríos' : 'Cold scattered showers',
            pop: 60,
            rainMm: 6,
            windSpeed: 35,
            windDir: 'SW',
            humidity: 68,
            et0: 2.5,
            agriRecommendation: lang === 'es' ? 'Aporte de milímetros escaso pero beneficioso para la humedad superficial.' : 'Low millimeter contribution, but beneficial for topsoil moisture.',
            agriStatus: 'good'
          },
          {
            day: lang === 'es' ? 'Vie' : 'Fri',
            date: '25 Sep',
            tempMin: 1,
            tempMax: 12,
            icon: 'sun',
            condition: lang === 'es' ? 'Muy frío al amanecer' : 'Very cold dawn',
            pop: 5,
            rainMm: 0,
            windSpeed: 15,
            windDir: 'SSW',
            humidity: 62,
            et0: 2.8,
            agriRecommendation: lang === 'es' ? 'Atención al suelo desprovisto de cobertura: mayor susceptibilidad a helada.' : 'Caution on bare soil: significantly higher frost susceptibility.',
            agriStatus: 'warning'
          }
        ]
      };
    }

    if (province.includes('misiones') || province.includes('corrientes')) {
      return {
        currentTemp: 26,
        apparentTemp: 28,
        tempMinToday: 18,
        tempMaxToday: 29,
        humidity: 82,
        dewPoint: 22,
        windSpeed: 11,
        windGusts: 19,
        windDirection: 'ENE',
        windDeg: 70,
        pressure: 1014,
        pressureTrend: 'stable',
        popToday: 40,
        rainAccumulatedToday: 4,
        uvIndex: 7,
        solarRadiation: 710,
        et0Today: 4.0,
        soilMoistureIndex: '88% (Capacidad de Campo plena en suelos rojos)',
        skyCondition: lang === 'es' ? 'Nubosidad variable con humedad alta' : 'Partly cloudy, warm and humid',
        spraySuitability: 'moderate',
        sprayReason: lang === 'es' ? 'Humedad relativa alta favorece absorción pero hay riesgo de chaparrón vespertino' : 'High humidity aids droplet uptake, but afternoon showers possible',
        hourly: [
          { time: '08:00', temp: 20, icon: 'cloud-sun', condition: lang === 'es' ? 'Bruma matinal' : 'Morning mist', pop: 20, windSpeed: 8 },
          { time: '11:00', temp: 24, icon: 'cloud-sun', condition: lang === 'es' ? 'Templado y húmedo' : 'Warm & humid', pop: 25, windSpeed: 10 },
          { time: '14:00', temp: 28, icon: 'rain', condition: lang === 'es' ? 'Chaparrones aislados' : 'Scattered showers', pop: 55, windSpeed: 15 },
          { time: '17:00', temp: 26, icon: 'cloud', condition: lang === 'es' ? 'Nublado' : 'Cloudy', pop: 40, windSpeed: 12 },
          { time: '20:00', temp: 22, icon: 'cloud', condition: lang === 'es' ? 'Cálido' : 'Warm night', pop: 20, windSpeed: 9 },
          { time: '23:00', temp: 20, icon: 'cloud-sun', condition: lang === 'es' ? 'Cielo semiabierto' : 'Partly clear', pop: 10, windSpeed: 7 },
        ],
        daily: [
          {
            day: lang === 'es' ? 'Hoy' : 'Today',
            date: '19 Sep',
            tempMin: 18,
            tempMax: 29,
            icon: 'rain',
            condition: lang === 'es' ? 'Chaparrones subtropicales' : 'Subtropical showers',
            pop: 55,
            rainMm: 8,
            windSpeed: 11,
            windDir: 'ENE',
            humidity: 82,
            et0: 4.0,
            agriRecommendation: lang === 'es' ? 'Monitorear roya y hongos en yerba mate y té por follaje húmedo continuado.' : 'Inspect rust & fungi in yerba mate and tea due to persistent leaf wetness.',
            agriStatus: 'warning'
          },
          {
            day: lang === 'es' ? 'Dom' : 'Sun',
            date: '20 Sep',
            tempMin: 19,
            tempMax: 30,
            icon: 'cloud-sun',
            condition: lang === 'es' ? 'Húmedo y caluroso' : 'Warm & humid',
            pop: 30,
            rainMm: 2,
            windSpeed: 12,
            windDir: 'E',
            humidity: 80,
            et0: 4.3,
            agriRecommendation: lang === 'es' ? 'Excelente hidratación del suelo; mantener curvas de nivel contra escorrentía.' : 'Soil hydration excellent; preserve contour bunds against runoff.',
            agriStatus: 'good'
          },
          {
            day: lang === 'es' ? 'Lun' : 'Mon',
            date: '21 Sep',
            tempMin: 19,
            tempMax: 31,
            icon: 'storm',
            condition: lang === 'es' ? 'Tormentas eléctricas convectivas' : 'Convective thunderstorms',
            pop: 80,
            rainMm: 28,
            windSpeed: 24,
            windDir: 'SE',
            humidity: 88,
            et0: 3.1,
            agriRecommendation: lang === 'es' ? 'Precipitación intensa esperada: drenajes y terrazas deben estar despejadas.' : 'Heavy rainfall expected: keep terraces and field drains clear.',
            agriStatus: 'alert'
          },
          {
            day: lang === 'es' ? 'Mar' : 'Tue',
            date: '22 Sep',
            tempMin: 17,
            tempMax: 26,
            icon: 'cloud-sun',
            condition: lang === 'es' ? 'Mejorando lentamente' : 'Gradual clearing',
            pop: 20,
            rainMm: 0,
            windSpeed: 10,
            windDir: 'S',
            humidity: 72,
            et0: 3.7,
            agriRecommendation: lang === 'es' ? 'Ventana favorable para fertilización foliar en plantaciones perennes.' : 'Favorable window for foliar fertilization in perennial groves.',
            agriStatus: 'good'
          },
          {
            day: lang === 'es' ? 'Mié' : 'Wed',
            date: '23 Sep',
            tempMin: 16,
            tempMax: 27,
            icon: 'sun',
            condition: lang === 'es' ? 'Soleado y agradable' : 'Sunny & pleasant',
            pop: 10,
            rainMm: 0,
            windSpeed: 9,
            windDir: 'SSE',
            humidity: 65,
            et0: 4.1,
            agriRecommendation: lang === 'es' ? 'Jornada ideal para labores de cosecha y transporte en caminos de tierra.' : 'Ideal day for harvest logistics and dirt-road hauling.',
            agriStatus: 'good'
          },
          {
            day: lang === 'es' ? 'Jue' : 'Thu',
            date: '24 Sep',
            tempMin: 17,
            tempMax: 28,
            icon: 'sun',
            condition: lang === 'es' ? 'Cálido primaveral' : 'Warm spring day',
            pop: 15,
            rainMm: 0,
            windSpeed: 11,
            windDir: 'NE',
            humidity: 68,
            et0: 4.4,
            agriRecommendation: lang === 'es' ? 'Buen balance hídrico general en la microcuenca.' : 'Sound overall water balance across the micro-basin.',
            agriStatus: 'good'
          },
          {
            day: lang === 'es' ? 'Vie' : 'Fri',
            date: '25 Sep',
            tempMin: 18,
            tempMax: 30,
            icon: 'cloud-sun',
            condition: lang === 'es' ? 'Templado con viento norte' : 'Warm with north breeze',
            pop: 25,
            rainMm: 1,
            windSpeed: 14,
            windDir: 'NNE',
            humidity: 74,
            et0: 4.7,
            agriRecommendation: lang === 'es' ? 'Verificar cobertura de rastrojo para evitar pérdidas por evaporación.' : 'Check mulch coverage to prevent evaporative losses.',
            agriStatus: 'good'
          }
        ]
      };
    }

    // Default: Pampean Central Region (Buenos Aires, Córdoba, Santa Fe, Entre Ríos)
    const isCordoba = province.includes('córdoba');
    const isEntreRios = province.includes('entre ríos');

    return {
      currentTemp: isCordoba ? 23 : 21,
      apparentTemp: isCordoba ? 22 : 21,
      tempMinToday: isCordoba ? 10 : 12,
      tempMaxToday: isCordoba ? 26 : 23,
      humidity: isEntreRios ? 76 : (isCordoba ? 54 : 64),
      dewPoint: isCordoba ? 11 : 13,
      windSpeed: isCordoba ? 19 : 14,
      windGusts: isCordoba ? 29 : 22,
      windDirection: isCordoba ? 'SSW' : 'ESE',
      windDeg: isCordoba ? 200 : 110,
      pressure: 1017,
      pressureTrend: 'rising',
      popToday: 10,
      rainAccumulatedToday: 0,
      uvIndex: 6,
      solarRadiation: 680,
      et0Today: 3.9,
      soilMoistureIndex: isCordoba ? '52% (Napa a 2.3m, perfil medio)' : '67% (Buena humedad en estrato radicular)',
      skyCondition: lang === 'es' ? 'Cielo despejado con viento moderado' : 'Clear skies with moderate breeze',
      spraySuitability: 'optimal',
      sprayReason: lang === 'es' ? 'Condición excelente: viento < 15 km/h, delta T óptimo (2 a 8°C) y sin lluvia' : 'Optimal spraying: wind < 15 km/h, delta T in target range (2-8°C)',
      hourly: [
        { time: '08:00', temp: 13, icon: 'sun', condition: lang === 'es' ? 'Soleado y fresco' : 'Sunny & cool', pop: 0, windSpeed: 9 },
        { time: '11:00', temp: 18, icon: 'sun', condition: lang === 'es' ? 'Despejado' : 'Clear', pop: 0, windSpeed: 12 },
        { time: '14:00', temp: 22, icon: 'sun', condition: lang === 'es' ? 'Agradable' : 'Pleasant', pop: 5, windSpeed: 14 },
        { time: '17:00', temp: 20, icon: 'cloud-sun', condition: lang === 'es' ? 'Algo nublado' : 'Partly sunny', pop: 10, windSpeed: 13 },
        { time: '20:00', temp: 16, icon: 'cloud-sun', condition: lang === 'es' ? 'Fresco' : 'Mild evening', pop: 5, windSpeed: 10 },
        { time: '23:00', temp: 14, icon: 'sun', condition: lang === 'es' ? 'Cielo despejado' : 'Clear night', pop: 0, windSpeed: 8 },
      ],
      daily: [
        {
          day: lang === 'es' ? 'Hoy' : 'Today',
          date: '19 Sep',
          tempMin: 12,
          tempMax: 23,
          icon: 'sun',
          condition: lang === 'es' ? 'Soleado y templado' : 'Sunny & mild',
          pop: 10,
          rainMm: 0,
          windSpeed: 14,
          windDir: 'ESE',
          humidity: 64,
          et0: 3.9,
          agriRecommendation: lang === 'es' ? 'Excelente ventana para aplicaciones terrestres de barbecho químico y monitoreo de malezas.' : 'Optimal window for pre-planting herbicide spraying and weed scouting.',
          agriStatus: 'good'
        },
        {
          day: lang === 'es' ? 'Dom' : 'Sun',
          date: '20 Sep',
          tempMin: 13,
          tempMax: 25,
          icon: 'cloud-sun',
          condition: lang === 'es' ? 'Parcialmente nublado' : 'Partly cloudy',
          pop: 15,
          rainMm: 0,
          windSpeed: 16,
          windDir: 'NE',
          humidity: 60,
          et0: 4.2,
          agriRecommendation: lang === 'es' ? 'Buenas condiciones térmicas para el desarrollo de macollos en trigo y cebada.' : 'Favorable thermal conditions for wheat and barley tillering.',
          agriStatus: 'good'
        },
        {
          day: lang === 'es' ? 'Lun' : 'Mon',
          date: '21 Sep',
          tempMin: 14,
          tempMax: 26,
          icon: 'cloud',
          condition: lang === 'es' ? 'Nublado con viento del norte' : 'Cloudy with north wind',
          pop: 35,
          rainMm: 1,
          windSpeed: 21,
          windDir: 'N',
          humidity: 68,
          et0: 4.5,
          agriRecommendation: lang === 'es' ? 'Atención al viento por la tarde; suspender pulverizaciones si ráfagas superan 20 km/h.' : 'Watch afternoon wind; pause spraying if gusts exceed 20 km/h.',
          agriStatus: 'warning'
        },
        {
          day: lang === 'es' ? 'Mar' : 'Tue',
          date: '22 Sep',
          tempMin: 15,
          tempMax: 22,
          icon: 'rain',
          condition: lang === 'es' ? 'Lluvias y tormentas aisladas' : 'Showers and scattered storms',
          pop: 80,
          rainMm: 24,
          windSpeed: 25,
          windDir: 'S',
          humidity: 85,
          et0: 2.3,
          agriRecommendation: lang === 'es' ? 'Recarga hídrica clave para la siembra de maíz temprano. Evitar tránsito de maquinaria pesada.' : 'Crucial moisture recharge for early corn planting. Avoid heavy equipment traffic.',
          agriStatus: 'good'
        },
        {
          day: lang === 'es' ? 'Mié' : 'Wed',
          date: '23 Sep',
          tempMin: 11,
          tempMax: 19,
          icon: 'cloud-sun',
          condition: lang === 'es' ? 'Fresco con cielo despejando' : 'Cool with clearing skies',
          pop: 15,
          rainMm: 0,
          windSpeed: 17,
          windDir: 'SSW',
          humidity: 68,
          et0: 3.1,
          agriRecommendation: lang === 'es' ? 'Esperar oreo de lotes; evaluar acumulación milimétrica con estaciones locales.' : 'Allow soil drainage; cross-check rain gauge accumulation with local stations.',
          agriStatus: 'good'
        },
        {
          day: lang === 'es' ? 'Jue' : 'Thu',
          date: '24 Sep',
          tempMin: 9,
          tempMax: 21,
          icon: 'sun',
          condition: lang === 'es' ? 'Despejado con noche fresca' : 'Clear with cool night',
          pop: 0,
          rainMm: 0,
          windSpeed: 11,
          windDir: 'SE',
          humidity: 58,
          et0: 3.6,
          agriRecommendation: lang === 'es' ? 'Ventana perfecta para fertilización nitrogenada en cereales de invierno.' : 'Ideal window for top-dress nitrogen fertilization in winter cereals.',
          agriStatus: 'good'
        },
        {
          day: lang === 'es' ? 'Vie' : 'Fri',
          date: '25 Sep',
          tempMin: 11,
          tempMax: 24,
          icon: 'sun',
          condition: lang === 'es' ? 'Agradable y soleado' : 'Pleasant & sunny',
          pop: 5,
          rainMm: 0,
          windSpeed: 13,
          windDir: 'ENE',
          humidity: 62,
          et0: 4.0,
          agriRecommendation: lang === 'es' ? 'Humedad en perfil estabilizada para planificar rotación y siembra de cultivos de servicio.' : 'Soil moisture profile stabilized to schedule cover crop seeding.',
          agriStatus: 'good'
        }
      ]
    };
  }, [farmProfile.location.province, lang]);

  const activeDay = weatherData.daily[selectedDayIndex] || weatherData.daily[0];

  const renderWeatherIcon = (iconName: HourlyForecast['icon'], className: string = 'w-5 h-5') => {
    switch (iconName) {
      case 'sun':
        return <Sun className={`${className} text-amber-500`} strokeWidth={2.2} />;
      case 'cloud-sun':
        return <CloudSun className={`${className} text-amber-500`} strokeWidth={2.2} />;
      case 'cloud':
        return <Cloud className={`${className} text-slate-400`} strokeWidth={2.2} />;
      case 'rain':
        return <CloudRain className={`${className} text-blue-500`} strokeWidth={2.2} />;
      case 'storm':
        return <CloudLightning className={`${className} text-purple-600`} strokeWidth={2.2} />;
      default:
        return <CloudSun className={className} strokeWidth={2.2} />;
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Hero Weather Card + Primary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Current Weather Card */}
        <div className="lg:col-span-5 bg-white dark:bg-[#1c1c1e] p-5 border border-slate-300 dark:border-[#2e2e33] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {lang === 'es' ? 'Condición Actual' : 'Current Condition'}
              </span>
              <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {lang === 'es' ? 'Datos simulados' : 'Simulated data'}
                <DemoBadge lang={lang} />
              </span>
            </div>

            <div className="flex items-baseline gap-4 mt-3">
              <div className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {weatherData.currentTemp}°<span className="text-2xl text-slate-400 font-normal">C</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                  {weatherData.skyCondition}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {lang === 'es' ? 'Sensación térmica:' : 'Feels like:'} <strong className="font-mono text-slate-700 dark:text-zinc-200">{weatherData.apparentTemp}°C</strong>
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {lang === 'es' ? 'Hoy:' : 'Today:'} Mín {weatherData.tempMinToday}°C • Máx {weatherData.tempMaxToday}°C
                </span>
              </div>
            </div>
          </div>

          {/* Spraying Suitability Badge */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#2e2e33]">
            <div className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>{lang === 'es' ? 'Aptitud para Aplicaciones / Pulverización:' : 'Agrochemical Spray Suitability:'}</span>
              {weatherData.spraySuitability === 'optimal' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" /> {lang === 'es' ? 'ÓPTIMA' : 'OPTIMAL'}
                </span>
              ) : weatherData.spraySuitability === 'moderate' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <AlertTriangle className="w-3 h-3" /> {lang === 'es' ? 'PRECAUCIÓN' : 'CAUTION'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                  <AlertTriangle className="w-3 h-3" /> {lang === 'es' ? 'DESFAVORABLE' : 'UNFAVORABLE'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed bg-slate-50 dark:bg-[#232326] p-2.5 border border-slate-200 dark:border-[#2f2f33]">
              {weatherData.sprayReason}
            </p>
          </div>
        </div>

        {/* 6 Key Agro-Meteo Cards Grid */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Humidity */}
          <div className="bg-white dark:bg-[#1c1c1e] p-3.5 border border-slate-300 dark:border-[#2e2e33] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>{lang === 'es' ? 'Humedad' : 'Humidity'}</span>
              <Droplets className="w-4 h-4 text-blue-500" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {weatherData.humidity}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                Punto rocío: <span className="font-mono">{weatherData.dewPoint}°C</span>
              </div>
            </div>
            <div className="w-full bg-slate-200 dark:bg-[#2c2c30] h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-full" style={{ width: `${weatherData.humidity}%` }} />
            </div>
          </div>

          {/* Wind */}
          <div className="bg-white dark:bg-[#1c1c1e] p-3.5 border border-slate-300 dark:border-[#2e2e33] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>{lang === 'es' ? 'Viento' : 'Wind'}</span>
              <Wind className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
                {weatherData.windSpeed} <span className="text-xs font-normal text-slate-500">km/h</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                Dir: <strong className="font-mono text-slate-800 dark:text-zinc-200">{weatherData.windDirection}</strong> • Ráfagas: {weatherData.windGusts} km/h
              </div>
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              {weatherData.windSpeed < 15 ? (lang === 'es' ? 'Viento moderado' : 'Mild wind') : (lang === 'es' ? 'Riesgo de deriva' : 'Drift risk')}
            </div>
          </div>

          {/* Precipitation / Rain */}
          <div className="bg-white dark:bg-[#1c1c1e] p-3.5 border border-slate-300 dark:border-[#2e2e33] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>{lang === 'es' ? 'Precipitación' : 'Rain Prob'}</span>
              <CloudRain className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {weatherData.popToday}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                {lang === 'es' ? 'Acumulado 24h:' : '24h Total:'} <strong className="font-mono text-slate-800 dark:text-zinc-200">{weatherData.rainAccumulatedToday} mm</strong>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400">
              {weatherData.popToday > 50 ? (lang === 'es' ? 'Lluvia probable' : 'Rain expected') : (lang === 'es' ? 'Sin alertas pluviales' : 'Dry conditions')}
            </div>
          </div>

          {/* Evapotranspiration ET0 */}
          <div className="bg-white dark:bg-[#1c1c1e] p-3.5 border border-slate-300 dark:border-[#2e2e33] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>{lang === 'es' ? 'Evapotranspiración (ET0)' : 'Evapotranspiration'}</span>
              <Thermometer className="w-4 h-4 text-amber-600" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
                {weatherData.et0Today} <span className="text-xs font-normal text-slate-500">mm/día</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                Demanda atmosférica
              </div>
            </div>
            <div className="text-[10px] text-slate-600 dark:text-zinc-400">
              Pérdida por rastrojo: baja
            </div>
          </div>

          {/* Barometric Pressure */}
          <div className="bg-white dark:bg-[#1c1c1e] p-3.5 border border-slate-300 dark:border-[#2e2e33] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>{lang === 'es' ? 'Presión Atmosférica' : 'Barometric Pressure'}</span>
              <Gauge className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
                {weatherData.pressure} <span className="text-xs font-normal text-slate-500">hPa</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                Tendencia: {weatherData.pressureTrend === 'stable' ? 'Estable' : weatherData.pressureTrend === 'rising' ? 'En alza (buen tiempo)' : 'En baja'}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400">
              Normal a nivel del mar
            </div>
          </div>

          {/* Solar Radiation & UV */}
          <div className="bg-white dark:bg-[#1c1c1e] p-3.5 border border-slate-300 dark:border-[#2e2e33] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>{lang === 'es' ? 'Radiación & UV' : 'Solar & UV'}</span>
              <Sun className="w-4 h-4 text-amber-500" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
                {weatherData.uvIndex} <span className="text-xs font-normal text-slate-500">UV</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                Rad: <span className="font-mono">{weatherData.solarRadiation} W/m²</span>
              </div>
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
              Fotosíntesis C3/C4 activa
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Timeline Forecast */}
      <div className="bg-white dark:bg-[#1c1c1e] p-4 sm:p-5 border border-slate-300 dark:border-[#2e2e33] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0f3260] dark:text-zinc-300" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {lang === 'es' ? 'Pronóstico Horario (Próximas 24 Horas)' : 'Hourly Forecast (Next 24 Hours)'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-zinc-400">
            {lang === 'es' ? 'Deslizá para ver detalle' : 'Scroll to view all hours'}
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {weatherData.hourly.map((hour, idx) => (
            <div
              key={idx}
              className="bg-slate-50 dark:bg-[#252528] border border-slate-200 dark:border-[#333336] p-3 flex flex-col items-center justify-between min-w-[100px] shrink-0 text-center"
            >
              <span className="text-xs font-bold font-mono text-slate-600 dark:text-zinc-400">
                {hour.time}
              </span>

              <div className="my-2">
                {renderWeatherIcon(hour.icon, 'w-6 h-6')}
              </div>

              <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                {hour.temp}°C
              </div>

              <div className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                <Droplets className="w-3 h-3" />
                <span>{hour.pop}%</span>
              </div>

              <div className="mt-1 text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                {hour.windSpeed} km/h
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Extended Weather Forecast */}
      <div className="bg-white dark:bg-[#1c1c1e] p-4 sm:p-5 border border-slate-300 dark:border-[#2e2e33] shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-[#2e2e33] pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0f3260] dark:text-zinc-300" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {lang === 'es' ? 'Pronóstico Extendido de 7 Días & Recomendaciones de Campo' : '7-Day Extended Forecast & Field Guidance'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-zinc-400">
            {lang === 'es' ? 'Tocá un día para ver recomendaciones' : 'Click day for details'}
          </span>
        </div>

        {/* 7 Days Table / List */}
        <div className="space-y-2">
          {weatherData.daily.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            return (
              <div
                key={idx}
                onClick={() => setSelectedDayIndex(idx)}
                className={`p-3 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/60 dark:bg-[#262830] border-[#0f3260] dark:border-blue-500/80 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-[#222225] border-slate-200 dark:border-[#2f2f33] hover:bg-slate-100 dark:hover:bg-[#28282c]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Day & Date & Condition */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-left w-14 shrink-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {day.day}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                        {day.date}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {renderWeatherIcon(day.icon, 'w-6 h-6')}
                    </div>

                    <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">
                      {day.condition}
                    </div>
                  </div>

                  {/* Middle & Right: Metrics and Thermal Scale */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-slate-600 dark:text-zinc-400 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-[#2f2f33]">
                    {/* Rain probability & Wind */}
                    <div className="flex items-center gap-3 sm:gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{day.pop}%</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span className="font-mono">{day.windSpeed} <span className="text-[10px] text-slate-400">km/h</span></span>
                      </div>
                    </div>

                    {/* Min - Max Thermal Scale */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 text-right">
                        {day.tempMin}°
                      </span>

                      {/* Gradient visual bar */}
                      <div className="w-16 sm:w-24 bg-slate-200 dark:bg-[#333336] h-2 rounded-full overflow-hidden relative">
                        <div
                          className="bg-linear-to-r from-blue-400 via-amber-400 to-rose-500 h-full rounded-full"
                          style={{
                            marginLeft: `${Math.max(0, (day.tempMin / 40) * 100)}%`,
                            width: `${Math.max(20, ((day.tempMax - day.tempMin) / 40) * 100)}%`
                          }}
                        />
                      </div>

                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        {day.tempMax}°
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Agricultural Recommendation for Selected Day */}
                {isSelected && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-[#38383e] flex items-start gap-2 text-xs">
                    {day.agriStatus === 'good' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : day.agriStatus === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="text-slate-700 dark:text-zinc-300 leading-relaxed">
                      <strong className="text-slate-900 dark:text-white font-semibold">
                        {lang === 'es' ? 'Pauta agronómica del día:' : 'Daily agronomic guidance:'}
                      </strong>{' '}
                      {day.agriRecommendation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
