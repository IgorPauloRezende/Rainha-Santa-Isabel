import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Calendar,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  Gauge,
  MapPin,
  RefreshCw,
  Search,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';
import stormBackgroundAsset from '../assets/images/storm_background_1794773063443.jpg';
import sunBackgroundAsset from '../assets/images/weather_sun_sky_1794775176894.jpg';
import partlyBackgroundAsset from '../assets/images/weather_partly_cloudy_1794775177824.jpg';
import cloudBackgroundAsset from '../assets/images/weather_overcast_clouds_1794775178551.jpg';
import rainBackgroundAsset from '../assets/images/weather_rain_drizzle_1794775178437.jpg';
import fogBackgroundAsset from '../assets/images/weather_fog_mist_1794775179196.jpg';
import { formatDatePt } from '../lib/format';
import type { ChurchEvent } from '../types/church';

interface WeatherForecastSectionProps {
  events: ChurchEvent[];
}

interface ParishStation {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
}

interface HourlyForecastItem {
  isoTime: string;
  hourLabel: string;
  hourNumber: number;
  temp: number;
  apparentTemp: number;
  humidity: number;
  dewPoint: number;
  precipProb: number;
  precipMm: number;
  weatherCode: number;
  windSpeed: number;
  windGusts: number;
  uvIndex: number;
}

interface DailyForecastItem {
  date: string;
  dayShort: string;
  dayFull: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  apparentMax: number;
  apparentMin: number;
  sunrise: string;
  sunset: string;
  uvMax: number;
  precipSum: number;
  precipProb: number;
  windMax: number;
  gustMax: number;
  hourly: HourlyForecastItem[];
}

interface AirQualityData {
  pm25: number;
  pm10: number;
  europeanAqi: number;
  label: string;
}

interface StationWeatherData {
  stationId: string;
  elevation: number;
  currentTimeIso: string;
  currentTemp: number;
  apparentTemp: number;
  humidity: number;
  dewPoint: number;
  pressureHpa: number;
  precipCurrent: number;
  windSpeed: number;
  windGusts: number;
  windDirectionDeg: number;
  windCardinal: string;
  uvCurrent: number;
  currentCode: number;
  fetchedAt: string;
  airQuality: AirQualityData | null;
  daily: DailyForecastItem[];
}

interface GeocodingCandidate {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
}

type WeatherKind = 'sun' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'storm';
type HourlyFilterMode = 'highlights' | 'all';

interface WeatherBackdropConfig {
  src: string;
  alt: string;
  scrimClass: string;
  fallbackGradientClass: string;
}

const WEATHER_BACKDROPS: Record<WeatherKind, WeatherBackdropConfig> = {
  sun: {
    src: sunBackgroundAsset,
    alt: 'Céu aberto com luz solar suave',
    scrimClass: 'bg-gradient-to-br from-[#06182c]/78 via-[#07203a]/52 to-[#07203a]/42',
    fallbackGradientClass: 'from-[#0b2a4a] via-[#13406b] to-[#1e527d]',
  },
  partly: {
    src: partlyBackgroundAsset,
    alt: 'Céu parcialmente nublado com nuvens iluminadas pelo sol',
    scrimClass: 'bg-gradient-to-br from-[#061626]/82 via-[#071c30]/56 to-[#071c30]/44',
    fallbackGradientClass: 'from-[#0b2238] via-[#173652] to-[#224766]',
  },
  cloud: {
    src: cloudBackgroundAsset,
    alt: 'Céu nublado com camadas densas de nuvens',
    scrimClass: 'bg-gradient-to-br from-[#0d141c]/84 via-[#111b24]/60 to-[#111b24]/48',
    fallbackGradientClass: 'from-[#171f27] via-[#25313d] to-[#323f4d]',
  },
  fog: {
    src: fogBackgroundAsset,
    alt: 'Neblina e nevoeiro suave no horizonte',
    scrimClass: 'bg-gradient-to-br from-[#0b1318]/84 via-[#101a20]/60 to-[#101a20]/50',
    fallbackGradientClass: 'from-[#182126] via-[#27343b] to-[#35444d]',
  },
  drizzle: {
    src: rainBackgroundAsset,
    alt: 'Nuvens de garoa e chuva leve',
    scrimClass: 'bg-gradient-to-br from-[#07131d]/85 via-[#0a1a27]/62 to-[#0a1a27]/50',
    fallbackGradientClass: 'from-[#0d1d29] via-[#152a3a] to-[#1f394d]',
  },
  rain: {
    src: rainBackgroundAsset,
    alt: 'Chuva intensa sob nuvens carregadas',
    scrimClass: 'bg-gradient-to-br from-[#05101a]/88 via-[#071724]/66 to-[#071724]/52',
    fallbackGradientClass: 'from-[#081520] via-[#102433] to-[#183347]',
  },
  storm: {
    src: stormBackgroundAsset,
    alt: 'Céu de tempestade com nuvens densas',
    scrimClass: 'bg-gradient-to-br from-[#041018]/88 via-[#041018]/60 to-[#041018]/48',
    fallbackGradientClass: 'from-[#04121b] via-[#0b1e2b] to-[#132c3d]',
  },
};

const UNIQUE_WEATHER_BACKGROUNDS: Array<{ key: WeatherKind; src: string; alt: string }> = [
  { key: 'sun', src: sunBackgroundAsset, alt: WEATHER_BACKDROPS.sun.alt },
  { key: 'partly', src: partlyBackgroundAsset, alt: WEATHER_BACKDROPS.partly.alt },
  { key: 'cloud', src: cloudBackgroundAsset, alt: WEATHER_BACKDROPS.cloud.alt },
  { key: 'fog', src: fogBackgroundAsset, alt: WEATHER_BACKDROPS.fog.alt },
  { key: 'rain', src: rainBackgroundAsset, alt: WEATHER_BACKDROPS.rain.alt },
  { key: 'storm', src: stormBackgroundAsset, alt: WEATHER_BACKDROPS.storm.alt },
];

const TOOLTIP_ANCHOR_CLASSES = [
  'left-2',
  'left-[12%] sm:left-[15%]',
  'left-[35%] -translate-x-1/2',
  'left-1/2 -translate-x-1/2',
  'left-[65%] -translate-x-1/2',
  'right-[12%] sm:right-[15%]',
  'right-2',
] as const;

const DEFAULT_PARISH_STATIONS: ParishStation[] = [
  {
    id: 'casa-verde',
    name: 'Casa Verde',
    subtitle: 'Igreja Matriz · R. Elias Gannam, 331',
    lat: -23.5034,
    lon: -46.6602,
  },
  {
    id: 'vila-bandeirantes',
    name: 'Vila Bandeirantes',
    subtitle: 'Capela Maranata',
    lat: -23.5092,
    lon: -46.6685,
  },
  {
    id: 'santana',
    name: 'Santana',
    subtitle: 'Região Episcopal · Zona Norte',
    lat: -23.5015,
    lon: -46.6254,
  },
  {
    id: 'se-centro',
    name: 'Sé · Centro',
    subtitle: 'Arquidiocese de São Paulo',
    lat: -23.5505,
    lon: -46.6333,
  },
];

const WEEKDAY_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_FULL_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const MASS_HOURS_SET = new Set([8, 10, 11, 15, 18, 19, 20]);

const formatOneDecimal = (value: number): string =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function degreesToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  const normalized = ((deg % 360) + 360) % 360;
  return dirs[Math.round(normalized / 45) % 8];
}

function classifyUv(uv: number): string {
  if (uv >= 11) return 'Extremo';
  if (uv >= 8) return 'Muito alto';
  if (uv >= 6) return 'Alto';
  if (uv >= 3) return 'Moderado';
  return 'Baixo';
}

function classifyEuropeanAqi(aqi: number): string {
  if (aqi <= 20) return 'Boa';
  if (aqi <= 40) return 'Razoável';
  if (aqi <= 60) return 'Moderada';
  if (aqi <= 80) return 'Ruim';
  return 'Muito ruim';
}

function describeWmoCode(code: number): { label: string; kind: WeatherKind } {
  if (code === 0) return { label: 'Céu limpo', kind: 'sun' };
  if (code === 1) return { label: 'Predomínio de sol', kind: 'partly' };
  if (code === 2) return { label: 'Parcialmente nublado', kind: 'partly' };
  if (code === 3) return { label: 'Nublado', kind: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Neblina ou nevoeiro', kind: 'fog' };
  if (code >= 51 && code <= 55) return { label: 'Garoa leve', kind: 'drizzle' };
  if (code === 56 || code === 57) return { label: 'Garoa intensa', kind: 'drizzle' };
  if (code === 61 || code === 80) return { label: 'Chuva fraca', kind: 'rain' };
  if (code === 63 || code === 81) return { label: 'Chuva moderada', kind: 'rain' };
  if (code === 65 || code === 82) return { label: 'Chuva forte', kind: 'rain' };
  if (code >= 66 && code <= 67) return { label: 'Chuva intensa', kind: 'rain' };
  if (code >= 95) return { label: 'Tempestade com raios', kind: 'storm' };
  return { label: 'Tempo variável', kind: 'partly' };
}

function WeatherGlyph({ kind, className = 'w-5 h-5' }: { kind: WeatherKind; className?: string }) {
  switch (kind) {
    case 'sun':
      return <Sun className={className} />;
    case 'partly':
      return <CloudSun className={className} />;
    case 'fog':
      return <CloudFog className={className} />;
    case 'drizzle':
      return <CloudDrizzle className={className} />;
    case 'rain':
      return <CloudRain className={className} />;
    case 'storm':
      return <CloudLightning className={className} />;
    default:
      return <Cloud className={className} />;
  }
}

function getPastoralGuidance(params: {
  precipProb: number;
  precipSum: number;
  windMax: number;
  weatherCode: number;
  uvMax: number;
}): {
  status: 'favorable' | 'attention' | 'alert';
  title: string;
  detail: string;
} {
  const { precipProb, precipSum, windMax, weatherCode, uvMax } = params;
  if (weatherCode >= 95 || precipSum >= 12 || precipProb >= 75) {
    return {
      status: 'alert',
      title: 'Priorizar espaços cobertos',
      detail:
        'Probabilidade elevada de chuva acumulada ou descargas elétricas. Recomenda-se concentrar procissões, acolhimento e sonorização no interior da Igreja Matriz ou no salão paroquial.',
    };
  }
  if (precipProb >= 40 || precipSum >= 2.5 || windMax >= 35) {
    return {
      status: 'attention',
      title: 'Atenção para atividades ao ar livre',
      detail:
        'Há risco moderado de chuva passageira ou rajadas de vento. Mantenha tendas, lonas e plano alternativo coberto preparados para atividades no pátio.',
    };
  }
  if (uvMax >= 8) {
    return {
      status: 'favorable',
      title: 'Tempo firme com radiação solar intensa',
      detail:
        'Baixo risco de chuva, porém com índice UV muito alto nos horários de pico. Recomenda-se sombra e hidratação para atividades externas entre 10h e 15h.',
    };
  }
  return {
    status: 'favorable',
    title: 'Condições favoráveis no pátio',
    detail:
      'Baixo risco de chuva e ventos controlados. Cenário adequado para acolhimento externo, eventos comunitários e deslocamento dos paroquianos.',
  };
}

function parseIsoDateLabels(isoDate: string): { short: string; full: string } {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const dayIndex = date.getDay();
  return {
    short: WEEKDAY_SHORT_PT[dayIndex] || isoDate.slice(5),
    full: WEEKDAY_FULL_PT[dayIndex] || isoDate,
  };
}

function formatClockFromIso(isoDateTime?: string): string {
  if (!isoDateTime || !isoDateTime.includes('T')) return '--:--';
  return isoDateTime.split('T')[1].slice(0, 5);
}

function buildSmoothCurve(points: Array<{ x: number; y: number }>): {
  strokePath: string;
  fillPath: string;
} {
  if (points.length === 0) return { strokePath: '', fillPath: '' };
  if (points.length === 1) {
    const p = points[0];
    return {
      strokePath: `M ${p.x} ${p.y}`,
      fillPath: `M ${p.x} ${p.y} L ${p.x} 138 Z`,
    };
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${midX} ${p0.y.toFixed(1)}, ${midX} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const last = points[points.length - 1];
  const first = points[0];
  return {
    strokePath: d,
    fillPath: `${d} L ${last.x.toFixed(1)} 146 L ${first.x.toFixed(1)} 146 Z`,
  };
}

interface OpenMeteoForecastPayload {
  elevation?: number;
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    dew_point_2m?: number;
    precipitation?: number;
    weather_code?: number;
    pressure_msl?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    apparent_temperature?: number[];
    relative_humidity_2m?: number[];
    dew_point_2m?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    weather_code?: number[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
    uv_index?: number[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    apparent_temperature_max?: number[];
    apparent_temperature_min?: number[];
    sunrise?: string[];
    sunset?: string[];
    uv_index_max?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    wind_gusts_10m_max?: number[];
  };
}

interface OpenMeteoAirPayload {
  current?: {
    pm10?: number;
    pm2_5?: number;
    european_aqi?: number;
  };
}

async function fetchStationForecast(
  station: ParishStation,
  signal?: AbortSignal
): Promise<StationWeatherData> {
  const forecastParams = new URLSearchParams({
    latitude: String(station.lat),
    longitude: String(station.lon),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly:
      'temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,uv_index',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max',
    timezone: 'America/Sao_Paulo',
    forecast_days: '7',
  });

  const airParams = new URLSearchParams({
    latitude: String(station.lat),
    longitude: String(station.lon),
    current: 'pm10,pm2_5,european_aqi',
    timezone: 'America/Sao_Paulo',
  });

  const [forecastRes, airRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`, { signal }),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${airParams.toString()}`, {
      signal,
    }).catch(() => null),
  ]);

  if (!forecastRes.ok) {
    throw new Error(`HTTP ${forecastRes.status}`);
  }

  const json = (await forecastRes.json()) as OpenMeteoForecastPayload;
  let airQuality: AirQualityData | null = null;
  if (airRes && airRes.ok) {
    try {
      const airJson = (await airRes.json()) as OpenMeteoAirPayload;
      if (airJson.current && typeof airJson.current.european_aqi === 'number') {
        const aqi = Math.round(airJson.current.european_aqi);
        airQuality = {
          pm25: Number((airJson.current.pm2_5 ?? 0).toFixed(1)),
          pm10: Number((airJson.current.pm10 ?? 0).toFixed(1)),
          europeanAqi: aqi,
          label: classifyEuropeanAqi(aqi),
        };
      }
    } catch {
      airQuality = null;
    }
  }

  const current = json.current || {};
  const hourlyRaw = json.hourly || {};
  const dailyRaw = json.daily || {};

  const hourlyByDate = new Map<string, HourlyForecastItem[]>();
  const hourlyTimes = hourlyRaw.time || [];
  hourlyTimes.forEach((isoTime, idx) => {
    const [datePart, timePart = '00:00'] = isoTime.split('T');
    const hourNum = Number(timePart.slice(0, 2));
    const entry: HourlyForecastItem = {
      isoTime,
      hourLabel: timePart.slice(0, 5),
      hourNumber: hourNum,
      temp: Number((hourlyRaw.temperature_2m?.[idx] ?? 0).toFixed(1)),
      apparentTemp: Number((hourlyRaw.apparent_temperature?.[idx] ?? 0).toFixed(1)),
      humidity: Math.round(hourlyRaw.relative_humidity_2m?.[idx] ?? 0),
      dewPoint: Number((hourlyRaw.dew_point_2m?.[idx] ?? 0).toFixed(1)),
      precipProb: Math.round(hourlyRaw.precipitation_probability?.[idx] ?? 0),
      precipMm: Number((hourlyRaw.precipitation?.[idx] ?? 0).toFixed(1)),
      weatherCode: hourlyRaw.weather_code?.[idx] ?? 2,
      windSpeed: Number((hourlyRaw.wind_speed_10m?.[idx] ?? 0).toFixed(1)),
      windGusts: Number((hourlyRaw.wind_gusts_10m?.[idx] ?? 0).toFixed(1)),
      uvIndex: Number((hourlyRaw.uv_index?.[idx] ?? 0).toFixed(1)),
    };
    const list = hourlyByDate.get(datePart) || [];
    list.push(entry);
    hourlyByDate.set(datePart, list);
  });

  const dates = dailyRaw.time || [];
  const daily: DailyForecastItem[] = dates.slice(0, 7).map((date, idx) => {
    const labels = parseIsoDateLabels(date);
    return {
      date,
      dayShort: idx === 0 ? 'Hoje' : labels.short,
      dayFull: idx === 0 ? 'Hoje' : labels.full,
      weatherCode: dailyRaw.weather_code?.[idx] ?? 2,
      tempMax: Number((dailyRaw.temperature_2m_max?.[idx] ?? 24).toFixed(1)),
      tempMin: Number((dailyRaw.temperature_2m_min?.[idx] ?? 16).toFixed(1)),
      apparentMax: Number((dailyRaw.apparent_temperature_max?.[idx] ?? 24).toFixed(1)),
      apparentMin: Number((dailyRaw.apparent_temperature_min?.[idx] ?? 16).toFixed(1)),
      sunrise: formatClockFromIso(dailyRaw.sunrise?.[idx]),
      sunset: formatClockFromIso(dailyRaw.sunset?.[idx]),
      uvMax: Number((dailyRaw.uv_index_max?.[idx] ?? 0).toFixed(1)),
      precipSum: Number((dailyRaw.precipitation_sum?.[idx] ?? 0).toFixed(1)),
      precipProb: Math.round(dailyRaw.precipitation_probability_max?.[idx] ?? 0),
      windMax: Number((dailyRaw.wind_speed_10m_max?.[idx] ?? 12).toFixed(1)),
      gustMax: Number((dailyRaw.wind_gusts_10m_max?.[idx] ?? 18).toFixed(1)),
      hourly: hourlyByDate.get(date) || [],
    };
  });

  const currentTimePrefix = current.time ? current.time.slice(0, 13) : '';
  const currentHourSlot =
    daily[0]?.hourly.find((h) => h.isoTime.startsWith(currentTimePrefix)) || daily[0]?.hourly[0];

  const windDir = Math.round(current.wind_direction_10m ?? 0);

  return {
    stationId: station.id,
    elevation: Math.round(json.elevation ?? 760),
    currentTimeIso: current.time || '',
    currentTemp: Number((current.temperature_2m ?? daily[0]?.tempMax ?? 22).toFixed(1)),
    apparentTemp: Number(
      (current.apparent_temperature ?? current.temperature_2m ?? 22).toFixed(1)
    ),
    humidity: Math.round(current.relative_humidity_2m ?? 65),
    dewPoint: Number((current.dew_point_2m ?? currentHourSlot?.dewPoint ?? 15).toFixed(1)),
    pressureHpa: Math.round(current.pressure_msl ?? 1013),
    precipCurrent: Number((current.precipitation ?? 0).toFixed(1)),
    windSpeed: Number((current.wind_speed_10m ?? 12).toFixed(1)),
    windGusts: Number((current.wind_gusts_10m ?? current.wind_speed_10m ?? 18).toFixed(1)),
    windDirectionDeg: windDir,
    windCardinal: degreesToCardinal(windDir),
    uvCurrent: Number((currentHourSlot?.uvIndex ?? 0).toFixed(1)),
    currentCode: current.weather_code ?? daily[0]?.weatherCode ?? 2,
    fetchedAt: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    airQuality,
    daily,
  };
}

export function WeatherForecastSection({ events }: WeatherForecastSectionProps) {
  const [stations, setStations] = useState<ParishStation[]>(DEFAULT_PARISH_STATIONS);
  const [selectedStationId, setSelectedStationId] = useState<string>(DEFAULT_PARISH_STATIONS[0].id);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [hourlyFilter, setHourlyFilter] = useState<HourlyFilterMode>('highlights');
  const [weatherByStation, setWeatherByStation] = useState<Record<string, StationWeatherData>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // City / Neighborhood Search via Open-Meteo Geocoding
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const loadStations = useCallback(
    async (targetStations: ParishStation[], signal?: AbortSignal) => {
      setLoading(true);
      setErrorMsg('');
      try {
        const results = await Promise.all(
          targetStations.map((station) => fetchStationForecast(station, signal))
        );
        if (signal?.aborted) return;
        const mapped: Record<string, StationWeatherData> = {};
        results.forEach((item) => {
          mapped[item.stationId] = item;
        });
        setWeatherByStation((prev) => ({ ...prev, ...mapped }));
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setErrorMsg(
          'Não foi possível consultar a previsão meteorológica online no momento. Verifique a conexão e tente novamente.'
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    loadStations(DEFAULT_PARISH_STATIONS, controller.signal);
    return () => controller.abort();
  }, [loadStations]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  async function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 2) return;
    setSearching(true);
    setSearchOpen(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=pt&format=json`
      );
      if (!res.ok) throw new Error('Falha na busca');
      const json = (await res.json()) as { results?: GeocodingCandidate[] };
      setSearchResults(json.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectSearchResult(candidate: GeocodingCandidate) {
    const customStation: ParishStation = {
      id: `custom-${candidate.id}`,
      name: candidate.name,
      subtitle: [candidate.admin1, candidate.country].filter(Boolean).join(' · ') || 'Local consultado',
      lat: Number(candidate.latitude.toFixed(4)),
      lon: Number(candidate.longitude.toFixed(4)),
    };
    setSearchOpen(false);
    setSearchQuery('');
    setStations((prev) => {
      const withoutDup = prev.filter((s) => s.id !== customStation.id);
      return [customStation, ...withoutDup.slice(0, 3)];
    });
    setSelectedStationId(customStation.id);
    setSelectedDayIdx(0);
    await loadStations([customStation]);
  }

  const activeStation = stations.find((s) => s.id === selectedStationId) || stations[0];
  const activeWeather = weatherByStation[activeStation.id] || null;
  const activeDay = activeWeather?.daily[selectedDayIdx] || activeWeather?.daily[0] || null;

  const displayTemp =
    selectedDayIdx === 0 && activeWeather ? activeWeather.currentTemp : activeDay?.tempMax ?? 0;
  const displayCode =
    selectedDayIdx === 0 && activeWeather ? activeWeather.currentCode : activeDay?.weatherCode ?? 2;
  const displayCondition = describeWmoCode(displayCode);
  const activeBackdrop = WEATHER_BACKDROPS[displayCondition.kind];
  const activeImageKey: WeatherKind =
    displayCondition.kind === 'drizzle' ? 'rain' : displayCondition.kind;

  const visibleHourlySlots = useMemo(() => {
    if (!activeDay) return [];
    if (hourlyFilter === 'all') return activeDay.hourly;
    return activeDay.hourly.filter(
      (h) => h.hourNumber % 3 === 0 || MASS_HOURS_SET.has(h.hourNumber)
    );
  }, [activeDay, hourlyFilter]);

  const guidance = useMemo(() => {
    if (!activeDay || !activeWeather) return null;
    return getPastoralGuidance({
      precipProb: activeDay.precipProb,
      precipSum: activeDay.precipSum,
      windMax: selectedDayIdx === 0 ? Math.max(activeWeather.windGusts, activeDay.windMax) : activeDay.gustMax,
      weatherCode: displayCode,
      uvMax: activeDay.uvMax,
    });
  }, [activeDay, activeWeather, displayCode, selectedDayIdx]);

  const curvePoints = useMemo(() => {
    const daily = activeWeather?.daily || [];
    if (daily.length === 0) return [];
    const temps = daily.map((d) => d.tempMax);
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);
    const spread = Math.max(3, maxT - minT);

    const xPadding = 44;
    const usableWidth = 720 - xPadding * 2;
    return daily.map((day, idx) => {
      const ratio = daily.length > 1 ? idx / (daily.length - 1) : 0.5;
      const x = xPadding + ratio * usableWidth;
      const normalizedTemp = (day.tempMax - minT) / spread;
      const y = 110 - normalizedTemp * 72;
      return { x, y, day, idx };
    });
  }, [activeWeather]);

  const curvePaths = useMemo(
    () => buildSmoothCurve(curvePoints.map(({ x, y }) => ({ x, y }))),
    [curvePoints]
  );

  const hoveredPoint =
    hoveredDayIdx !== null && curvePoints[hoveredDayIdx] ? curvePoints[hoveredDayIdx] : null;

  const upcomingEventsWithWeather = useMemo(() => {
    const baseWeather = weatherByStation[stations[0].id] || activeWeather;
    if (!baseWeather) return [];
    const dayMap = new Map(baseWeather.daily.map((d) => [d.date, d]));

    return events
      .filter((evt) => evt.published && dayMap.has(evt.date))
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .slice(0, 5)
      .map((evt) => {
        const day = dayMap.get(evt.date)!;
        const eventHour = Number((evt.time || '12:00').slice(0, 2));
        const exactHour =
          day.hourly.find((h) => h.hourNumber === eventHour) ||
          day.hourly[Math.min(day.hourly.length - 1, Math.max(0, eventHour))] ||
          null;
        return { event: evt, day, exactHour };
      });
  }, [activeWeather, events, stations, weatherByStation]);

  return (
    <section className="space-y-6">
      {/* Header Row + Geocoding Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
            Tempo e Clima
          </h1>
          <p className="text-[13px] text-[#6E6E73] mt-0.5 tabular-nums">
            Coordenadas {activeStation.lat.toFixed(4)}, {activeStation.lon.toFixed(4)}
            {activeWeather ? ` · Altitude ${activeWeather.elevation} m · Leitura às ${activeWeather.fetchedAt}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div ref={searchBoxRef} className="relative">
            <form onSubmit={handleSearchSubmit} className="flex items-center">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#6E6E73] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Consultar outra cidade ou bairro..."
                  aria-label="Consultar outra cidade ou bairro"
                  className="w-[235px] sm:w-[260px] pl-8 pr-7 py-2 rounded-xl bg-white border border-black/[0.08] text-[12.5px] text-[#1D1D1F] focus:outline-none focus:border-[#218838]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchOpen(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>

            {searchOpen && (
              <div className="absolute right-0 mt-2 w-[280px] sm:w-[320px] rounded-xl bg-white border border-black/[0.1] shadow-lg z-30 overflow-hidden">
                {searching ? (
                  <p className="px-4 py-3 text-[12.5px] text-[#6E6E73]">
                    Buscando coordenadas...
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="px-4 py-3 text-[12.5px] text-[#6E6E73]">
                    Nenhuma localidade encontrada. Tente digitar o nome da cidade.
                  </p>
                ) : (
                  <div className="divide-y divide-black/[0.06]">
                    {searchResults.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => handleSelectSearchResult(candidate)}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#F5F5F7] transition-colors cursor-pointer"
                      >
                        <p className="text-[13px] font-medium text-[#1D1D1F] truncate">
                          {candidate.name}
                        </p>
                        <p className="text-[11.5px] text-[#6E6E73] truncate tabular-nums">
                          {[candidate.admin1, candidate.country].filter(Boolean).join(' · ')} ·{' '}
                          {candidate.latitude.toFixed(2)}, {candidate.longitude.toFixed(2)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => loadStations(stations)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-black/[0.08] hover:border-black/20 text-[12.5px] font-medium text-[#1D1D1F] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#6E6E73] ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="rounded-2xl bg-white border border-red-200 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-[#1D1D1F]">
              Previsão temporariamente indisponível
            </p>
            <p className="text-[13px] text-[#6E6E73] mt-0.5">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => loadStations(stations)}
            className="px-4 py-2 rounded-xl bg-[#1D1D1F] text-white text-[12.5px] font-medium hover:bg-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Primary Atmospheric Weather Stage */}
      <div
        className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${activeBackdrop.fallbackGradientClass} text-white border border-black/[0.08]`}
      >
        {UNIQUE_WEATHER_BACKGROUNDS.map((bg) => {
          const isActiveBg = bg.key === activeImageKey;
          if (failedImages[bg.key]) return null;
          return (
            <img
              key={bg.key}
              src={bg.src}
              alt={isActiveBg ? bg.alt : ''}
              aria-hidden={!isActiveBg}
              referrerPolicy="no-referrer"
              onError={() =>
                setFailedImages((prev) => (prev[bg.key] ? prev : { ...prev, [bg.key]: true }))
              }
              className={`absolute inset-0 w-full h-full object-cover object-[center_25%] pointer-events-none select-none transition-opacity duration-500 ${
                isActiveBg ? 'opacity-85' : 'opacity-0'
              }`}
            />
          );
        })}
        <div
          aria-hidden="true"
          className={`absolute inset-0 pointer-events-none transition-colors duration-500 ${activeBackdrop.scrimClass}`}
        />

        <div className="relative z-10 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Hero + 7-Day Curve */}
          <div className="lg:col-span-8 flex flex-col justify-between gap-8">
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-white/80">
                <MapPin className="w-3.5 h-3.5 text-white/85 shrink-0" />
                <span className="font-medium text-white">{activeStation.name}</span>
                <span aria-hidden="true">·</span>
                <span>{activeStation.subtitle}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {activeDay ? formatDatePt(activeDay.date) : 'Carregando data'}
                </span>
              </div>

              {loading && !activeWeather ? (
                <div className="space-y-3 py-4">
                  <div className="h-12 w-72 rounded-xl bg-white/10 animate-pulse" />
                  <div className="h-5 w-96 max-w-full rounded-lg bg-white/10 animate-pulse" />
                </div>
              ) : activeWeather && activeDay ? (
                <>
                  <h2 className="text-[34px] sm:text-[44px] font-semibold tracking-tight leading-[1.08] text-white">
                    {displayCondition.label}
                  </h2>
                  <p className="max-w-2xl text-[14.5px] leading-relaxed text-white/88 tabular-nums">
                    {selectedDayIdx === 0
                      ? `Leitura atual de ${formatOneDecimal(activeWeather.currentTemp)}°C com sensação térmica de ${formatOneDecimal(activeWeather.apparentTemp)}°C e ponto de orvalho em ${formatOneDecimal(activeWeather.dewPoint)}°C. Vento de ${formatOneDecimal(activeWeather.windSpeed)} km/h (${activeWeather.windCardinal}) com rajadas de ${formatOneDecimal(activeWeather.windGusts)} km/h.`
                      : `${activeDay.dayFull}: mínima de ${formatOneDecimal(activeDay.tempMin)}°C (sensação ${formatOneDecimal(activeDay.apparentMin)}°C) e máxima de ${formatOneDecimal(activeDay.tempMax)}°C (sensação ${formatOneDecimal(activeDay.apparentMax)}°C). Volume estimado de ${formatOneDecimal(activeDay.precipSum)} mm (${activeDay.precipProb}% de probabilidade) e rajadas de até ${formatOneDecimal(activeDay.gustMax)} km/h.`}
                  </p>
                </>
              ) : null}
            </div>

            {/* 7-Day Curve Strip */}
            <div>
              {loading && !activeWeather ? (
                <div className="h-[195px] w-full rounded-xl bg-white/10 animate-pulse" />
              ) : activeWeather && curvePoints.length > 0 ? (
                <div className="rounded-2xl bg-white/[0.11] backdrop-blur-xl border border-white/18 p-4 sm:p-5">
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {activeWeather.daily.map((day, idx) => {
                      const info = describeWmoCode(day.weatherCode);
                      const isSelected = idx === selectedDayIdx;
                      const isHovered = idx === hoveredDayIdx;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => setSelectedDayIdx(idx)}
                          onMouseEnter={() => setHoveredDayIdx(idx)}
                          onMouseLeave={() => setHoveredDayIdx((cur) => (cur === idx ? null : cur))}
                          onFocus={() => setHoveredDayIdx(idx)}
                          onBlur={() => setHoveredDayIdx((cur) => (cur === idx ? null : cur))}
                          className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-white/22 text-white'
                              : isHovered
                                ? 'bg-white/14 text-white'
                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="text-[17px] sm:text-[21px] font-semibold tracking-tight tabular-nums leading-none">
                            {formatOneDecimal(day.tempMax)}°
                          </span>
                          <WeatherGlyph kind={info.kind} className="w-4 h-4 sm:w-5 sm:h-5 text-white/95" />
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative mt-2 h-[114px] w-full">
                    {hoveredPoint && (
                      <div
                        role="tooltip"
                        className={`pointer-events-none absolute bottom-[calc(100%+6px)] z-30 w-[235px] sm:w-[255px] rounded-xl bg-[#0b151e]/95 backdrop-blur-xl border border-white/20 px-3.5 py-3 shadow-xl text-white ${
                          TOOLTIP_ANCHOR_CLASSES[hoveredPoint.idx] || 'left-1/2 -translate-x-1/2'
                        }`}
                      >
                        {(() => {
                          const hoveredCond = describeWmoCode(hoveredPoint.day.weatherCode);
                          return (
                            <div className="space-y-2 tabular-nums">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[12.5px] font-semibold text-white truncate">
                                    {hoveredPoint.day.dayFull}
                                  </p>
                                  <p className="text-[11px] text-white/70">
                                    {formatDatePt(hoveredPoint.day.date)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <WeatherGlyph
                                    kind={hoveredCond.kind}
                                    className="w-4 h-4 text-white/95"
                                  />
                                  <span className="text-[14px] font-semibold text-white">
                                    {formatOneDecimal(hoveredPoint.day.tempMax)}°C
                                  </span>
                                </div>
                              </div>

                              <p className="text-[12px] text-white/90">{hoveredCond.label}</p>

                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1.5 border-t border-white/15 text-[11.5px] text-white/80">
                                <span>
                                  Mínima:{' '}
                                  <strong className="font-medium text-white">
                                    {formatOneDecimal(hoveredPoint.day.tempMin)}°C
                                  </strong>
                                </span>
                                <span>
                                  Sensação:{' '}
                                  <strong className="font-medium text-white">
                                    {formatOneDecimal(hoveredPoint.day.apparentMax)}°C
                                  </strong>
                                </span>
                                <span>
                                  Chuva:{' '}
                                  <strong className="font-medium text-white">
                                    {hoveredPoint.day.precipProb}% (
                                    {formatOneDecimal(hoveredPoint.day.precipSum)} mm)
                                  </strong>
                                </span>
                                <span>
                                  Rajadas:{' '}
                                  <strong className="font-medium text-white">
                                    {formatOneDecimal(hoveredPoint.day.gustMax)} km/h
                                  </strong>
                                </span>
                                <span>
                                  UV máx:{' '}
                                  <strong className="font-medium text-white">
                                    {formatOneDecimal(hoveredPoint.day.uvMax)}
                                  </strong>
                                </span>
                                <span>
                                  Sol:{' '}
                                  <strong className="font-medium text-white">
                                    {hoveredPoint.day.sunrise}–{hoveredPoint.day.sunset}
                                  </strong>
                                </span>
                              </div>

                              <p className="text-[10.5px] text-white/60 pt-0.5">
                                {hoveredPoint.idx === selectedDayIdx
                                  ? 'Dia ativo no painel'
                                  : 'Clique no ponto para fixar este dia'}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <svg
                      viewBox="0 0 720 146"
                      preserveAspectRatio="none"
                      className="w-full h-full overflow-visible"
                      role="img"
                      aria-label="Curva de temperatura máxima para os próximos 7 dias"
                    >
                      <defs>
                        <linearGradient id="parish-weather-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {curvePaths.fillPath && (
                        <path
                          d={curvePaths.fillPath}
                          fill="url(#parish-weather-fill)"
                          className="pointer-events-none"
                        />
                      )}
                      {curvePaths.strokePath && (
                        <path
                          d={curvePaths.strokePath}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          className="pointer-events-none"
                        />
                      )}
                      {curvePoints.map((pt) => {
                        const isSelected = pt.idx === selectedDayIdx;
                        const isHovered = pt.idx === hoveredDayIdx;
                        const cond = describeWmoCode(pt.day.weatherCode);
                        return (
                          <g
                            key={pt.day.date}
                            role="button"
                            tabIndex={0}
                            aria-label={`${pt.day.dayFull} (${formatDatePt(pt.day.date)}): máxima ${formatOneDecimal(pt.day.tempMax)}°C, mínima ${formatOneDecimal(pt.day.tempMin)}°C, ${cond.label}`}
                            onClick={() => setSelectedDayIdx(pt.idx)}
                            onMouseEnter={() => setHoveredDayIdx(pt.idx)}
                            onMouseLeave={() =>
                              setHoveredDayIdx((cur) => (cur === pt.idx ? null : cur))
                            }
                            onFocus={() => setHoveredDayIdx(pt.idx)}
                            onBlur={() =>
                              setHoveredDayIdx((cur) => (cur === pt.idx ? null : cur))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedDayIdx(pt.idx);
                              }
                            }}
                            className="cursor-pointer focus:outline-none"
                          >
                            {(isSelected || isHovered) && (
                              <line
                                x1={pt.x}
                                y1={pt.y}
                                x2={pt.x}
                                y2={146}
                                stroke={
                                  isHovered
                                    ? 'rgba(255,255,255,0.62)'
                                    : 'rgba(255,255,255,0.38)'
                                }
                                strokeWidth={isHovered ? '2' : '1.5'}
                                strokeDasharray="3 3"
                                className="pointer-events-none"
                              />
                            )}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? 7 : isSelected ? 5.5 : 3.8}
                              fill={
                                isHovered || isSelected ? '#ffffff' : 'rgba(255,255,255,0.8)'
                              }
                              stroke={
                                isHovered
                                  ? 'rgba(255,255,255,0.55)'
                                  : isSelected
                                    ? 'rgba(255,255,255,0.38)'
                                    : 'none'
                              }
                              strokeWidth={isHovered ? 8 : isSelected ? 6 : 0}
                              className="transition-all duration-150"
                            />
                            <circle cx={pt.x} cy={pt.y} r={22} fill="transparent" />
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
                    {activeWeather.daily.map((day, idx) => {
                      const isSelected = idx === selectedDayIdx;
                      const isHovered = idx === hoveredDayIdx;
                      return (
                        <button
                          key={`label-${day.date}`}
                          type="button"
                          onClick={() => setSelectedDayIdx(idx)}
                          onMouseEnter={() => setHoveredDayIdx(idx)}
                          onMouseLeave={() => setHoveredDayIdx((cur) => (cur === idx ? null : cur))}
                          onFocus={() => setHoveredDayIdx(idx)}
                          onBlur={() => setHoveredDayIdx((cur) => (cur === idx ? null : cur))}
                          className={`text-center py-1 rounded-lg text-[11.5px] sm:text-[12.5px] transition-colors cursor-pointer ${
                            isSelected || isHovered
                              ? 'font-semibold text-white'
                              : 'font-medium text-white/75 hover:text-white'
                          }`}
                        >
                          <span>{day.dayShort}</span>
                          <span className="block text-[10.5px] text-white/65 tabular-nums mt-0.5">
                            {day.precipProb}% · {formatOneDecimal(day.tempMin)}°
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Glass Rail: Main Reading + Stations */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="rounded-2xl bg-white/[0.17] backdrop-blur-xl border border-white/22 p-5 sm:p-6 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] text-white/75 truncate">{activeStation.subtitle}</p>
                  <p className="text-[16px] font-semibold text-white truncate">{activeStation.name}</p>
                </div>
                <WeatherGlyph
                  kind={displayCondition.kind}
                  className="w-7 h-7 text-white/95 shrink-0"
                />
              </div>

              {loading && !activeWeather ? (
                <div className="h-20 w-32 rounded-xl bg-white/15 animate-pulse" />
              ) : activeWeather && activeDay ? (
                <>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[48px] sm:text-[54px] font-semibold tracking-tight leading-none tabular-nums">
                        {formatOneDecimal(displayTemp)}°C
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-white/80 tabular-nums">
                      Mín {formatOneDecimal(activeDay.tempMin)}°C · Máx{' '}
                      {formatOneDecimal(activeDay.tempMax)}°C
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/15 text-[12px] tabular-nums">
                    <div className="flex items-center gap-1.5 text-white/90">
                      <Wind className="w-3.5 h-3.5 text-white/75 shrink-0" />
                      <span>
                        {formatOneDecimal(
                          selectedDayIdx === 0 ? activeWeather.windSpeed : activeDay.windMax
                        )}{' '}
                        km/h
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/90">
                      <Droplets className="w-3.5 h-3.5 text-white/75 shrink-0" />
                      <span>{activeDay.precipProb}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/90">
                      <Thermometer className="w-3.5 h-3.5 text-white/75 shrink-0" />
                      <span>
                        {selectedDayIdx === 0
                          ? `${activeWeather.humidity}% u.r.`
                          : `${formatOneDecimal(activeDay.precipSum)} mm`}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 flex-1">
              {stations.map((station) => {
                const stData = weatherByStation[station.id];
                const isCurrent = station.id === selectedStationId;
                const cond = stData ? describeWmoCode(stData.currentCode) : null;
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => {
                      setSelectedStationId(station.id);
                      setSelectedDayIdx(0);
                    }}
                    className={`w-full text-left rounded-2xl px-4 py-3 backdrop-blur-xl border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isCurrent
                        ? 'bg-white/[0.24] border-white/45'
                        : 'bg-white/[0.13] border-white/18 hover:bg-white/[0.20]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[11.5px] text-white/75 truncate">{station.subtitle}</p>
                      <p className="text-[14.5px] font-semibold text-white truncate">
                        {station.name}
                      </p>
                      <p className="text-[12px] text-white/80 truncate mt-0.5 tabular-nums">
                        {cond
                          ? `${cond.label} · ${stData.humidity}% u.r.`
                          : loading
                            ? 'Carregando...'
                            : 'Indisponível'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[20px] font-semibold tracking-tight tabular-nums text-white">
                        {stData ? `${formatOneDecimal(stData.currentTemp)}°` : '--'}
                      </span>
                      {cond && <WeatherGlyph kind={cond.kind} className="w-5 h-5 text-white/90" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* High-Precision Atmospheric Telemetry Strip */}
      {activeWeather && activeDay && (
        <div className="rounded-2xl bg-white border border-black/[0.08] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06]">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-1.5 text-[12px] text-[#6E6E73]">
              <Thermometer className="w-3.5 h-3.5 shrink-0" />
              <span>Ponto de orvalho</span>
            </div>
            <p className="mt-1.5 text-[20px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
              {formatOneDecimal(activeWeather.dewPoint)}°C
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#6E6E73] tabular-nums">
              Umidade {activeWeather.humidity}%
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-1.5 text-[12px] text-[#6E6E73]">
              <Gauge className="w-3.5 h-3.5 shrink-0" />
              <span>Pressão atmosférica</span>
            </div>
            <p className="mt-1.5 text-[20px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
              {activeWeather.pressureHpa.toLocaleString('pt-BR')} hPa
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#6E6E73]">Ao nível do mar</p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-1.5 text-[12px] text-[#6E6E73]">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Vento e rajadas</span>
            </div>
            <p className="mt-1.5 text-[20px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
              {formatOneDecimal(activeWeather.windSpeed)} km/h {activeWeather.windCardinal}
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#6E6E73] tabular-nums">
              Rajadas {formatOneDecimal(activeWeather.windGusts)} km/h ({activeWeather.windDirectionDeg}°)
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-1.5 text-[12px] text-[#6E6E73]">
              <Sun className="w-3.5 h-3.5 shrink-0" />
              <span>Índice UV</span>
            </div>
            <p className="mt-1.5 text-[20px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
              {formatOneDecimal(selectedDayIdx === 0 ? activeWeather.uvCurrent : activeDay.uvMax)}
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#6E6E73] tabular-nums">
              {classifyUv(selectedDayIdx === 0 ? activeWeather.uvCurrent : activeDay.uvMax)} · Máx dia{' '}
              {formatOneDecimal(activeDay.uvMax)}
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-1.5 text-[12px] text-[#6E6E73]">
              <Sunrise className="w-3.5 h-3.5 shrink-0" />
              <span>Ciclo solar</span>
            </div>
            <p className="mt-1.5 text-[20px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
              {activeDay.sunrise}
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#6E6E73] tabular-nums inline-flex items-center gap-1">
              <Sunset className="w-3 h-3" />
              Pôr do sol {activeDay.sunset}
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-1.5 text-[12px] text-[#6E6E73]">
              <Wind className="w-3.5 h-3.5 shrink-0" />
              <span>Qualidade do ar</span>
            </div>
            <p className="mt-1.5 text-[20px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
              {activeWeather.airQuality
                ? `${activeWeather.airQuality.label} (${activeWeather.airQuality.europeanAqi})`
                : '--'}
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#6E6E73] tabular-nums">
              {activeWeather.airQuality
                ? `PM2.5 ${formatOneDecimal(activeWeather.airQuality.pm25)} · PM10 ${formatOneDecimal(activeWeather.airQuality.pm10)} µg/m³`
                : 'Leitura indisponível'}
            </p>
          </div>
        </div>
      )}

      {/* Hourly Breakdown for Selected Day (Precision Mass & Event Check) */}
      {activeDay && activeDay.hourly.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-[#1D1D1F]">
                Previsão hora a hora · {activeDay.dayFull} ({formatDatePt(activeDay.date)})
              </h3>
              <p className="text-[12.5px] text-[#6E6E73] mt-0.5">
                Acompanhe temperatura, chuva em milímetros e rajadas nos horários de missas e eventos
              </p>
            </div>

            <div
              role="group"
              aria-label="Detalhamento horário"
              className="inline-flex items-center rounded-xl bg-[#EBEBF0] p-1"
            >
              <button
                type="button"
                onClick={() => setHourlyFilter('highlights')}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                  hourlyFilter === 'highlights'
                    ? 'bg-white text-[#1D1D1F] shadow-2xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                Principais horários
              </button>
              <button
                type="button"
                onClick={() => setHourlyFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                  hourlyFilter === 'all'
                    ? 'bg-white text-[#1D1D1F] shadow-2xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                24 horas completas
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#FAFAFB] text-[12px] font-medium text-[#6E6E73]">
                  <th className="py-2.5 px-6">Hora</th>
                  <th className="py-2.5 px-4">Condição</th>
                  <th className="py-2.5 px-4 text-right">Temp.</th>
                  <th className="py-2.5 px-4 text-right">Sensação</th>
                  <th className="py-2.5 px-4 text-right">Chuva</th>
                  <th className="py-2.5 px-4 text-right">Umidade</th>
                  <th className="py-2.5 px-6 text-right">Vento / Rajada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] text-[13px] tabular-nums">
                {visibleHourlySlots.map((slot) => {
                  const cond = describeWmoCode(slot.weatherCode);
                  const isMassHour = MASS_HOURS_SET.has(slot.hourNumber);
                  return (
                    <tr
                      key={slot.isoTime}
                      className="hover:bg-[#F5F5F7]/70 transition-colors"
                    >
                      <td className="py-2.5 px-6 font-medium text-[#1D1D1F] whitespace-nowrap">
                        <span>{slot.hourLabel}</span>
                        {isMassHour && (
                          <span className="ml-2 text-[11.5px] font-normal text-[#218838]">
                            · faixa de missa
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[#424245]">
                        <span className="inline-flex items-center gap-2">
                          <WeatherGlyph kind={cond.kind} className="w-4 h-4 text-[#218838] shrink-0" />
                          <span>{cond.label}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-[#1D1D1F]">
                        {formatOneDecimal(slot.temp)}°C
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#6E6E73]">
                        {formatOneDecimal(slot.apparentTemp)}°C
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#1D1D1F]">
                        {slot.precipProb}% · {formatOneDecimal(slot.precipMm)} mm
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#6E6E73]">{slot.humidity}%</td>
                      <td className="py-2.5 px-6 text-right text-[#6E6E73]">
                        {formatOneDecimal(slot.windSpeed)} / {formatOneDecimal(slot.windGusts)} km/h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pastoral Operational Guidance + Upcoming Events Hourly Cross-Check */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-black/[0.08] p-6">
          <p className="text-[12px] font-medium text-[#6E6E73]">
            Orientação para atividades externas ·{' '}
            {activeDay ? activeDay.dayFull : 'Dia selecionado'}
          </p>
          <h3 className="mt-1.5 text-[16px] font-semibold text-[#1D1D1F]">
            {guidance ? guidance.title : 'Aguardando leitura meteorológica'}
          </h3>
          <p className="mt-2 text-[13.5px] text-[#424245] leading-relaxed">
            {guidance
              ? guidance.detail
              : 'Selecione um dia na faixa acima para verificar recomendações para procissões, celebrações e atividades no pátio.'}
          </p>
          {activeDay && (
            <div className="mt-4 pt-4 border-t border-black/[0.06] flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-[#6E6E73] tabular-nums">
              <span>
                Chuva prevista:{' '}
                <strong className="text-[#1D1D1F] font-semibold">
                  {activeDay.precipProb}% ({formatOneDecimal(activeDay.precipSum)} mm)
                </strong>
              </span>
              <span>
                Rajada máxima:{' '}
                <strong className="text-[#1D1D1F] font-semibold">
                  {formatOneDecimal(activeDay.gustMax)} km/h
                </strong>
              </span>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-black/[0.08] p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
                Clima exato no horário dos próximos eventos
              </h3>
              <p className="text-[12.5px] text-[#6E6E73] mt-0.5">
                Cruzamento por hora com a agenda paroquial publicada para os próximos 7 dias
              </p>
            </div>
            <Calendar className="w-4 h-4 text-[#6E6E73] shrink-0" />
          </div>

          {upcomingEventsWithWeather.length === 0 ? (
            <p className="text-[13px] text-[#6E6E73] py-4 leading-relaxed">
              Nenhum evento publicado está agendado para os próximos 7 dias. Ao publicar celebrações
              ou encontros dentro dessa janela na aba Eventos, a previsão para o horário exato do
              evento aparecerá automaticamente aqui.
            </p>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {upcomingEventsWithWeather.map(({ event, day, exactHour }) => {
                const cond = describeWmoCode(exactHour ? exactHour.weatherCode : day.weatherCode);
                return (
                  <div
                    key={event.id}
                    className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-4 text-[13px]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#1D1D1F] truncate">{event.title}</p>
                      <p className="text-[12px] text-[#6E6E73] tabular-nums mt-0.5 truncate">
                        {formatDatePt(event.date)} às {event.time} · {event.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 tabular-nums text-right">
                      <div>
                        <p className="font-semibold text-[#1D1D1F]">
                          {exactHour
                            ? `${formatOneDecimal(exactHour.temp)}°C às ${exactHour.hourLabel}`
                            : `${formatOneDecimal(day.tempMin)}° / ${formatOneDecimal(day.tempMax)}°C`}
                        </p>
                        <p className="text-[11.5px] text-[#6E6E73]">
                          {cond.label} ·{' '}
                          {exactHour
                            ? `${exactHour.precipProb}% (${formatOneDecimal(exactHour.precipMm)} mm)`
                            : `${day.precipProb}% chuva`}
                        </p>
                      </div>
                      <WeatherGlyph kind={cond.kind} className="w-5 h-5 text-[#218838]" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
