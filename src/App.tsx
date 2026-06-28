import './App.css';
import { useCallback, useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import { Icon } from 'leaflet';
import busStopsCsv from '../data/mtr_bus_stops.csv?raw';
import routeDataCsv from '../data/mtr_bus_routes.csv?raw';
import myLocation from '../src/assets/myLocation.svg';

const ETA_DATA_URL = "https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule";
const DEFAULT_ROUTE_ID = 'K73';
const DEFAULT_LANGUAGE: 'en' | 'zh' = 'zh';
const DEFAULT_DIRECTION: 'outbound' | 'inbound' = 'outbound';
const DEFAULT_MAP_CENTER: [number, number] = [22.450817833333335, 114.02288500000002];
const DEFAULT_MAP_ZOOM = 13;
const FOCUSED_MAP_ZOOM = 15;

const UI_COPY = {
  en: {
    refetchData: 'Refetch data',
    refreshing: 'Refreshing...',
    loadingData: 'Loading data from server...',
    emptyDepartureData: 'No departures at the moment... ૮(◞ ‸ ◟ )ა',
    loadingRouteCsv: 'Loading route CSV...',
    routeCsvError: 'Error fetching route CSV:',
    dataError: 'Error fetching data:',
    direction: 'Direction',
    route: 'Bus route',
    languageSelector: 'Language selector',
    directionSelector: 'Direction selector',
    outbound: 'Outbound',
    inbound: 'Inbound',
    noRoutesLoaded: 'No routes loaded',
    busId: 'Bus ID',
    arrivingAt: 'Arriving at',
    departingFrom: 'Departing from',
    arrivingIn: 'Arriving',
    durationUnits: {
      hour: 'h',
      minute: 'm',
      second: 's',
    },
  },
  zh: {
    refetchData: '重新載入資料',
    refreshing: '更新中...',
    loadingData: '正在從伺服器載入資料...',
    emptyDepartureData: '現時沒有班次... ૮(◞ ‸ ◟ )ა',
    loadingRouteCsv: '正在載入路線資料...',
    routeCsvError: '路線 CSV 載入失敗：',
    dataError: '資料載入失敗：',
    direction: '方向',
    route: '巴士路線',
    languageSelector: '語言選擇',
    directionSelector: '方向選擇',
    outbound: '去程',
    inbound: '回程',
    noRoutesLoaded: '未載入路線',
    busId: '車輛編號',
    arrivingAt: '到達',
    departingFrom: '從...開出',
    arrivingIn: '將於',
    durationUnits: {
      hour: '小時',
      minute: '分',
      second: '秒',
    },
  },
} as const;

type RouteRecord = {
  routeId: string;
  routeNameChi: string;
  routeNameEng: string;
  isCircular: boolean;
  lineUp: string;
  lineDown: string;
  referenceId: string;
};

type RouteStopRecord = {
  routeId: string;
  direction: 'O' | 'I';
  stationSeqNo: number;
  stationId: string;
  stationLatitude: number;
  stationLongitude: number;
  stationNameChi: string;
  stationNameEng: string;
  referenceId: string;
};

type BusPoint = {
  busLocation: { latitude: number; longitude: number };
  busId: string;
  arrivalTimeInSecond: number;
  departureTimeInSecond: number;
};

type UpcomingStop = {
  name: string;
  arrivalSeconds: number;
  departureSeconds: number;
};

type BusStopRecord = {
  bus: BusPoint[];
  busStopId: string;
  busStopRemark: string | null;
  busStopStatus: string | null;
  busStopStatusRemarkContent: string | null;
  busStopStatusRemarkTitle: string | null;
  busStopStatusTime: string | null;
  isSuspended: string;
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = '';
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (isInsideQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        isInsideQuotes = !isInsideQuotes;
      }
      continue;
    }

    if (character === ',' && !isInsideQuotes) {
      values.push(currentValue);
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);
  return values;
}

function parseRouteCsv(csvText: string): RouteRecord[] {
  const rows = csvText.trim().split(/\r?\n/);

  if (rows.length === 0) {
    return [];
  }

  const headers = parseCsvLine(rows[0]).map((header) => header.trim());
  const columnIndexes = new Map(headers.map((header, index) => [header, index]));

  const getColumnValue = (cells: string[], columnName: string) => {
    const columnIndex = columnIndexes.get(columnName);

    if (columnIndex === undefined) {
      return '';
    }

    return (cells[columnIndex] ?? '').trim();
  };

  return rows.slice(1).filter((row) => row.trim().length > 0).map((row) => {
    const cells = parseCsvLine(row);

    return {
      routeId: getColumnValue(cells, 'ROUTE_ID'),
      routeNameChi: getColumnValue(cells, 'ROUTE_NAME_CHI'),
      routeNameEng: getColumnValue(cells, 'ROUTE_NAME_ENG'),
      isCircular: getColumnValue(cells, 'IS_CIRCULAR') === '1',
      lineUp: getColumnValue(cells, 'LINE_UP'),
      lineDown: getColumnValue(cells, 'LINE_DOWN'),
      referenceId: getColumnValue(cells, 'REFERENCE_ID'),
    };
  });
}

function parseRouteStopCsv(csvText: string): RouteStopRecord[] {
  const rows = csvText.trim().split(/\r?\n/);

  if (rows.length === 0) {
    return [];
  }

  const headers = parseCsvLine(rows[0]).map((header) => header.trim());
  const columnIndexes = new Map(headers.map((header, index) => [header, index]));

  const getColumnValue = (cells: string[], columnName: string) => {
    const columnIndex = columnIndexes.get(columnName);

    if (columnIndex === undefined) {
      return '';
    }

    return (cells[columnIndex] ?? '').trim();
  };

  return rows.slice(1).filter((row) => row.trim().length > 0).map((row) => {
    const cells = parseCsvLine(row);

    return {
      routeId: getColumnValue(cells, 'ROUTE_ID'),
      direction: getColumnValue(cells, 'DIRECTION') === 'I' ? 'I' : 'O',
      stationSeqNo: Number(getColumnValue(cells, 'STATION_SEQNO')),
      stationId: getColumnValue(cells, 'STATION_ID'),
      stationLatitude: Number(getColumnValue(cells, 'STATION_LATITUDE')),
      stationLongitude: Number(getColumnValue(cells, 'STATION_LONGITUDE')),
      stationNameChi: getColumnValue(cells, 'STATION_NAME_CHI'),
      stationNameEng: getColumnValue(cells, 'STATION_NAME_ENG'),
      referenceId: getColumnValue(cells, 'REFERENCE_ID'),
    };
  });
}

const routeStopRecords = parseRouteStopCsv(busStopsCsv);

function getStopDirection(busStopId: string): 'outbound' | 'inbound' {
  return busStopId.includes('-D') ? 'inbound' : 'outbound';
}

function getRouteDirectionLabel(routeId: string, direction: 'outbound' | 'inbound', language: 'en' | 'zh') {
  const routeStops = routeStopRecords.filter((routeStop) => routeStop.referenceId === routeId);
  const directionStops = routeStops.filter((routeStop) => (direction === 'outbound' ? routeStop.direction === 'O' : routeStop.direction === 'I'));
  const terminalStop = directionStops[directionStops.length - 1] ?? routeStops[routeStops.length - 1];

  if (!terminalStop) {
    return direction === 'outbound' ? UI_COPY[language].outbound : UI_COPY[language].inbound;
  }

  return language === 'en' ? terminalStop.stationNameEng : terminalStop.stationNameChi;
}

function getUpcomingStops(
  busId: string,
  routeId: string,
  direction: 'outbound' | 'inbound',
  busStops: BusStopRecord[],
  language: 'en' | 'zh',

): UpcomingStop[] {
  const routeStops = routeStopRecords.filter((routeStop) => routeStop.referenceId === routeId);
  const directionStops = routeStops.filter((routeStop) => (direction === 'outbound' ? routeStop.direction === 'O' : routeStop.direction === 'I'));

  if (directionStops.length === 0) {
    return [];
  }

  const upcomingStops: UpcomingStop[] = [];

  for (const busStop of busStops) {
    const busEntry = busStop.bus.find((bus) => bus.busId === busId);

    if (!busEntry || Number(busEntry.arrivalTimeInSecond) < 0) {
      continue;
    }

    const routeStop = directionStops.find((candidateStop) => candidateStop.stationId === busStop.busStopId);

    if (!routeStop) {
      continue;
    }

    upcomingStops.push({
      name: language === 'en' ? routeStop.stationNameEng : routeStop.stationNameChi,
      arrivalSeconds: Number(busEntry.arrivalTimeInSecond),
      departureSeconds: Number(busEntry.departureTimeInSecond),
    });

    if (upcomingStops.length === 3) {
      break;
    }
  }

  return upcomingStops;
}

function formatSecondsLabel(seconds: number, language: 'en' | 'zh') {
  const normalizedSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const remainingSeconds = normalizedSeconds % 60;
  const { durationUnits } = UI_COPY[language];
  const parts = [
    hours > 0 ? `${hours}${durationUnits.hour}` : '',
    minutes > 0 ? `${minutes}${durationUnits.minute}` : '',
    `${remainingSeconds}${durationUnits.second}`,
  ].filter((part) => part.length > 0);

  return parts.join(' ');
}

function formatStopLine(stop: UpcomingStop, language: 'en' | 'zh') {
  const copy = UI_COPY[language];

  if (stop.departureSeconds === 0) {
    return language === 'en' ? `${copy.departingFrom} ${stop.name}` : `正在${stop.name} ${copy.departingFrom}`;
  }

  if (stop.arrivalSeconds === 0) {
    return language === 'en' ? `${copy.arrivingAt} ${stop.name}` : `已${copy.arrivingAt} ${stop.name}`;
  }

  return language === 'en'
    ? `${copy.arrivingIn} ${stop.name} at ${formatSecondsLabel(stop.arrivalSeconds, language)}`
    : `${copy.arrivingIn} ${formatSecondsLabel(stop.arrivalSeconds, language)} 後${copy.arrivingAt} ${stop.name}`;
}

function MapFocusController({ latitude, longitude, zoom }: { latitude: number; longitude: number; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], zoom, { animate: true });
  }, [latitude, longitude, map, zoom]);

  return null;
}

function BusMarker({
  lat, long, id, tooltipLines, language,
}: {
  lat: number,
  long: number,
  id: string,
  tooltipLines: UpcomingStop[],
  language: 'en' | 'zh',
}) {
  const copy = UI_COPY[language];

  return (
    <CircleMarker center={[lat, long]} pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.9, weight: 2 }} radius={8}>
      <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={false} sticky>
        <div>
          <div>{copy.busId}: {id}</div>
          {tooltipLines.map((stop) => (
            <div key={stop.name}>{formatStopLine(stop, language)}</div>
          ))}
        </div>
      </Tooltip>
    </CircleMarker>
  )
}

function RouteStopMarker({
  seqNo, lat, long, name,
}: {
  seqNo: number;
  lat: number;
  long: number;
  name: string;
}) {
  return (
    <Marker position={[lat, long]} icon={new Icon({ iconUrl: markerIconPng, iconSize: [25, 41], iconAnchor: [12, 41] })} >
      <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={false} sticky>
        <div>{seqNo}. {name}</div>
      </Tooltip>
    </Marker>
  );
}

function BusRouteMap() {
  const [mapData, setMapData] = useState<Array<{
    busLocation: { latitude: number; longitude: number };
    busId: string;
    arrivalTimeInSecond: number;
  }>>([]);
  const [routeMarkers, setRouteMarkers] = useState<Array<{
    stationId: string;
    stationSeqNo: number;
    stationLatitude: number;
    stationLongitude: number;
    stationNameChi: string;
    stationNameEng: string;
  }>>([]);
  const [routeData, setRouteData] = useState<RouteRecord[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState(DEFAULT_ROUTE_ID);
  const [selectedRouteReferenceId, setSelectedRouteReferenceId] = useState(DEFAULT_ROUTE_ID);
  const [selectedDirection, setSelectedDirection] = useState<'outbound' | 'inbound'>(DEFAULT_DIRECTION);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'zh'>(DEFAULT_LANGUAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busStops, setBusStops] = useState<BusStopRecord[]>([]);

  const [isOneWayRoute, setIsOneWayRoute] = useState(false);

  const fetchBusData = useCallback(async (routeName: string, direction: 'outbound' | 'inbound', language: 'en' | 'zh') => {
    const url = ETA_DATA_URL;
    const payload = { language, routeName };

    setLoading(true);
    setError(null);

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((actualData) => {
        const nextBusStops = Array.isArray(actualData?.busStop) ? (actualData.busStop as BusStopRecord[]) : [];
        setBusStops(nextBusStops);

        const directionStops = nextBusStops.filter((busStop) => getStopDirection(busStop.busStopId) === direction);

        if (directionStops.length === 0) {
          setMapData([]);
          return;
        }

        const selectedStop = directionStops[directionStops.length - 1];

        setMapData((selectedStop?.bus ?? []).filter((bus) => bus.busLocation.latitude !== 0 || bus.busLocation.longitude !== 0));
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const fetchRouteData = useCallback(async () => {
    setRouteData(parseRouteCsv(routeDataCsv));
  }, []);

  /*const watchGpsLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapFocusLatitude(latitude);
        setMapFocusLongitude(longitude);
      },
      (err) => {
        setError(`${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);*/

  useEffect(() => {
    void fetchBusData(selectedRouteId, selectedDirection, selectedLanguage);
  }, [fetchBusData, selectedRouteId, selectedDirection, selectedLanguage]);

  useEffect(() => {
    setMapData([]);
  }, [selectedRouteId]);

  useEffect(() => {
    const isSelectedRouteOneWay = routeStopRecords
      .filter((routeStop) => routeStop.referenceId === selectedRouteReferenceId && routeStop.direction === 'I')
      .length === 0;
    if (isSelectedRouteOneWay) setSelectedDirection("outbound")
    setIsOneWayRoute(isSelectedRouteOneWay)
    setRouteMarkers(
      routeStopRecords
        .filter((routeStop) => routeStop.referenceId === selectedRouteReferenceId && (selectedDirection === 'outbound' ? routeStop.direction === 'O' : routeStop.direction === 'I'))
        .sort((a, b) => a.stationSeqNo - b.stationSeqNo)
        .map((routeStop) => ({
          stationId: routeStop.stationId,
          stationSeqNo: routeStop.stationSeqNo,
          stationLatitude: routeStop.stationLatitude,
          stationLongitude: routeStop.stationLongitude,
          stationNameChi: routeStop.stationNameChi,
          stationNameEng: routeStop.stationNameEng,
        })),
    );
  }, [selectedRouteReferenceId, selectedDirection]);

  useEffect(() => {
    void fetchRouteData();
  }, [fetchRouteData]);

  useEffect(() => {
    if (routeData.length === 0) {
      return;
    }

    const routeExists = routeData.some((route) => route.referenceId === selectedRouteReferenceId);

    if (!routeExists) {
      setSelectedRouteId(routeData[0].routeId);
      setSelectedRouteReferenceId(routeData[0].referenceId);
    }
  }, [routeData, selectedRouteReferenceId]);

  const routeOptions = routeData;

  const selectedRoute = routeOptions.find((route) => route.referenceId === selectedRouteReferenceId);
  const isCircularRoute = selectedRoute?.isCircular ?? false;
  const selectedRouteName = selectedRoute?.routeId ?? selectedRouteId;
  const mapFocus = routeMarkers[0];
  const mapFocusLatitude = mapFocus?.stationLatitude ?? DEFAULT_MAP_CENTER[0];
  const mapFocusLongitude = mapFocus?.stationLongitude ?? DEFAULT_MAP_CENTER[1];

  return (
    <div className="map-shell">
      <div className="map-gps">
        <button className="map-gps-button" onClick={() => /*void watchGpsLocation()*/ { }}>
          <img src={myLocation} alt='My Location' />
        </button>
      </div>
      <div className="map-topbar flex-col items-end sm:flex-row sm:items-center">
        {error && <div className="map-status-panel map-status-panel--error">{UI_COPY[selectedLanguage].dataError} {error}</div>}
        {!loading && !error && mapData.length === 0 && <div className="map-status-panel map-status-panel--error">{UI_COPY[selectedLanguage].emptyDepartureData}</div>}
        <button className="map-refetch-button" onClick={() => void fetchBusData(selectedRouteName, selectedDirection, selectedLanguage)} disabled={loading} type="button">
          {loading ? UI_COPY[selectedLanguage].refreshing : UI_COPY[selectedLanguage].refetchData}
        </button>
        <div className="route-status-panel__segment route-status-panel__segment--compact" role="group" aria-label={UI_COPY[selectedLanguage].languageSelector}>
          <button
            type="button"
            className={`route-status-panel__lang-button ${selectedLanguage === 'en' ? 'route-status-panel__lang-button--active' : ''}`}
            onClick={() => setSelectedLanguage('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={`route-status-panel__lang-button ${selectedLanguage === 'zh' ? 'route-status-panel__lang-button--active' : ''}`}
            onClick={() => setSelectedLanguage('zh')}
          >
            繁中
          </button>
        </div>
      </div>
      <div className="route-status-panel">
        <label className="route-status-panel__label" htmlFor="route-select">
          {UI_COPY[selectedLanguage].route}
        </label>
        <select
          id="route-select"
          className="route-status-panel__select"
          value={selectedRouteReferenceId}
          onChange={(event) => {
            const nextRoute = routeOptions.find((route) => route.referenceId === event.target.value);

            setSelectedRouteReferenceId(event.target.value);
            setSelectedRouteId(nextRoute?.routeId ?? event.target.value);
          }}
          disabled={routeOptions.length === 0}
        >
          {routeOptions.length === 0 ? (
            <option value={selectedRouteReferenceId}>{UI_COPY[selectedLanguage].noRoutesLoaded}</option>
          ) : (
            routeOptions.map((route) => (
              <option key={route.referenceId || `${route.routeId}-${route.lineUp}-${route.lineDown}`} value={route.referenceId}>
                {route.referenceId} - {selectedLanguage === 'en' ? route.routeNameEng : route.routeNameChi}
              </option>
            ))
          )}
        </select>
        {
          !isCircularRoute &&
          <>
            <span className="route-status-panel__label">
              {UI_COPY[selectedLanguage].direction}
            </span>
            <div className="route-status-panel__segment route-status-panel__segment--buttons" role="group" aria-label={UI_COPY[selectedLanguage].directionSelector}>
              <button
                type="button"
                className={`route-status-panel__direction-button ${selectedDirection === 'outbound' ? 'route-status-panel__direction-button--active' : ''}`}
                onClick={() => setSelectedDirection('outbound')}
              >
                {getRouteDirectionLabel(selectedRouteId, 'outbound', selectedLanguage)}
              </button>
              {
                !isOneWayRoute &&
                <button
                  type="button"
                  className={`route-status-panel__direction-button ${selectedDirection === 'inbound' ? 'route-status-panel__direction-button--active' : ''}`}
                  onClick={() => setSelectedDirection('inbound')}
                >
                  {getRouteDirectionLabel(selectedRouteId, 'inbound', selectedLanguage)}
                </button>
              }
            </div>
          </>
        }
      </div>
      <MapContainer center={DEFAULT_MAP_CENTER} zoom={DEFAULT_MAP_ZOOM} className='map-canvas'>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFocusController latitude={mapFocusLatitude} longitude={mapFocusLongitude} zoom={FOCUSED_MAP_ZOOM} />
        {routeMarkers.map((routeMarker) => (
          <RouteStopMarker
            key={routeMarker.stationId}
            seqNo={routeMarker.stationSeqNo}
            lat={routeMarker.stationLatitude}
            long={routeMarker.stationLongitude}
            name={selectedLanguage === 'en' ? routeMarker.stationNameEng : routeMarker.stationNameChi}
          />
        ))}
        {mapData.map((x, i) => (
          <BusMarker
            key={i}
            lat={x.busLocation.latitude}
            long={x.busLocation.longitude}
            id={x.busId}
            language={selectedLanguage}
            tooltipLines={getUpcomingStops(x.busId, selectedRouteId, selectedDirection, busStops, selectedLanguage)}
          />
        ))}
      </MapContainer>
    </div>
  );
}

function App() {
  return (
    <>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin="" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin=""></script>
      </head>
      <BusRouteMap />
    </>
  )
}

export default App
