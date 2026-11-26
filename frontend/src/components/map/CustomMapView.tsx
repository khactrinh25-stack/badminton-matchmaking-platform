import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { MapPin, Search, Loader2, Navigation, X } from 'lucide-react';

const sessionMarkerIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" fill="none">
    <path d="M16 0C7.163 0 0 7.163 0 16C0 27.2 16 40 16 40C16 40 32 27.2 32 16C32 7.163 24.837 0 16 0Z" fill="#059669"/>
    <circle cx="16" cy="15" r="6" fill="white"/>
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -36],
});

const selectedMarkerIcon = L.divIcon({
  className: 'custom-map-pin-selected',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" fill="none">
    <path d="M16 0C7.163 0 0 7.163 0 16C0 27.2 16 40 16 40C16 40 32 27.2 32 16C32 7.163 24.837 0 16 0Z" fill="#dc2626"/>
    <circle cx="16" cy="15" r="6" fill="white"/>
  </svg>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -36],
});

export interface MapCoordinate {
  lat: number;
  lng: number;
}

export interface MapMarker extends MapCoordinate {
  id: string;
  title?: string;
  subtitle?: string;
  onClick?: () => void;
}

export interface SelectedLocation extends MapCoordinate {
  address: string;
}

export interface CustomMapViewProps {
  center: MapCoordinate;
  markers?: MapMarker[];
  radiusKm?: number;
  zoom?: number;
  height?: string;
  searchable?: boolean;
  className?: string;
  onLocationSelect?: (location: SelectedLocation) => void;
}

interface SearchSuggestion {
  placeId: string;
  title: string;
  label: string;
  lat: number;
  lng: number;
}

const MAP_PROVIDER =
  (import.meta.env.VITE_MAP_PROVIDER as string | undefined)?.toLowerCase() || 'nominatim';
const GOONG_API_KEY = (import.meta.env.VITE_GOONG_API_KEY as string | undefined) || '';

async function searchAddress(query: string): Promise<SearchSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (MAP_PROVIDER === 'goong' && GOONG_API_KEY) {
    const autoUrl = `https://rsapi.goong.io/Place/AutoComplete?api_key=${encodeURIComponent(
      GOONG_API_KEY,
    )}&input=${encodeURIComponent(trimmed)}`;
    const autoRes = await fetch(autoUrl);
    if (!autoRes.ok) throw new Error('Không thể tìm kiếm địa chỉ qua Goong Maps');
    const autoData = (await autoRes.json()) as {
      predictions?: Array<{
        place_id: string;
        description: string;
        structured_formatting?: { main_text?: string; secondary_text?: string };
      }>;
    };
    const predictions = (autoData.predictions || []).slice(0, 5);

    const details = await Promise.all(
      predictions.map(async (item) => {
        const detailUrl = `https://rsapi.goong.io/Place/Detail?place_id=${encodeURIComponent(
          item.place_id,
        )}&api_key=${encodeURIComponent(GOONG_API_KEY)}`;
        const detailRes = await fetch(detailUrl);
        if (!detailRes.ok) return null;
        const detailData = (await detailRes.json()) as {
          result?: { geometry?: { location?: { lat: number; lng: number } } };
        };
        const loc = detailData.result?.geometry?.location;
        if (!loc) return null;
        return {
          placeId: item.place_id,
          title: item.structured_formatting?.main_text || item.description,
          label: item.description,
          lat: loc.lat,
          lng: loc.lng,
        };
      }),
    );

    return details.filter((d): d is SearchSuggestion => d !== null);
  }

  // Default: OpenStreetMap Nominatim with namedetails
  const url = `https://nominatim.openstreetmap.org/search?format=json&namedetails=1&addressdetails=1&limit=5&countrycodes=vn&q=${encodeURIComponent(
    trimmed,
  )}`;
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'vi',
    },
  });
  if (!res.ok) throw new Error('Không thể tìm kiếm địa chỉ qua Nominatim');
  const data = (await res.json()) as Array<{
    place_id: number;
    name?: string;
    namedetails?: { name?: string };
    display_name: string;
    lat: string;
    lon: string;
  }>;

  return data.map((item) => {
    const poiName = item.namedetails?.name || item.name;
    return {
      placeId: String(item.place_id),
      title: poiName || item.display_name.split(',')[0],
      label: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    };
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    if (MAP_PROVIDER === 'goong' && GOONG_API_KEY) {
      const url = `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${encodeURIComponent(
        GOONG_API_KEY,
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{ formatted_address?: string }>;
        };
        const address = data.results?.[0]?.formatted_address;
        if (address) return address;
      }
    } else {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'vi',
        },
      });
      if (res.ok) {
        const data = (await res.json()) as { display_name?: string };
        if (data.display_name) return data.display_name;
      }
    }
  } catch {
    // Fallback to coordinates string when offline or rate-limited
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function MapViewportSync({ center, zoom }: { center: MapCoordinate; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

function MapClickHandler({
  onSelect,
}: {
  onSelect?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (onSelect) {
        onSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

/**
 * Adapter chuẩn hóa bản đồ Leaflet + Nominatim/Goong (NFR-10).
 * Mọi trang giao diện chỉ giao tiếp qua Props của component này.
 */
export const CustomMapView: React.FC<CustomMapViewProps> = ({
  center,
  markers = [],
  radiusKm,
  zoom = 13,
  height = '360px',
  searchable,
  className = '',
  onLocationSelect,
}) => {
  const showSearch = searchable ?? Boolean(onLocationSelect);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapCoordinate | null>(null);
  const skipNextAutocompleteRef = useRef(false);

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchAddress(trimmed);
      setSuggestions(results);
      if (results.length === 0) {
        setSearchError('Không tìm thấy địa chỉ phù hợp.');
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Lỗi tìm kiếm địa chỉ');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced autocomplete while typing (similar to Google Maps)
  useEffect(() => {
    if (!showSearch) return;
    if (skipNextAutocompleteRef.current) {
      skipNextAutocompleteRef.current = false;
      return;
    }
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void runSearch(trimmed);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [searchQuery, showSearch]);

  const handleSelectSuggestion = (item: SearchSuggestion) => {
    skipNextAutocompleteRef.current = true;
    setSuggestions([]);
    setSearchError(null);
    setSearchQuery(item.label);
    setSelectedPoint({ lat: item.lat, lng: item.lng });
    onLocationSelect?.({
      lat: item.lat,
      lng: item.lng,
      address: item.label,
    });
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (!onLocationSelect) return;
    skipNextAutocompleteRef.current = true;
    setSuggestions([]);
    setSelectedPoint({ lat, lng });
    const address = await reverseGeocode(lat, lng);
    setSearchQuery(address);
    onLocationSelect({ lat, lng, address });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation || !onLocationSelect) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        skipNextAutocompleteRef.current = true;
        setSuggestions([]);
        setSelectedPoint({ lat, lng });
        const address = await reverseGeocode(lat, lng);
        setSearchQuery(address);
        onLocationSelect({ lat, lng, address });
      },
      () => {
        setSearchError('Không thể truy cập vị trí GPS hiện tại.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const effectiveCenter = selectedPoint ?? center;

  return (
    <div className={`relative w-full ${className}`}>
      {showSearch && (
        <div className="mb-2 space-y-1 relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void runSearch(searchQuery);
                  }
                }}
                placeholder="Nhập tên sân, đường, quận để tìm gợi ý..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {isSearching ? (
                <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-600" />
              ) : (
                searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                      setSearchError(null);
                    }}
                    title="Xóa tìm kiếm"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )
              )}
            </div>
            {onLocationSelect && (
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                title="Lấy vị trí GPS hiện tại"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700 hover:bg-slate-50"
              >
                <Navigation className="h-4 w-4" />
              </button>
            )}
          </div>

          {searchError && <p className="text-xs text-rose-600">{searchError}</p>}

          {suggestions.length > 0 && (
            <ul className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg divide-y divide-slate-100">
              {suggestions.map((item) => (
                <li key={item.placeId}>
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-emerald-50"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">{item.title}</p>
                      <p className="line-clamp-2 text-[11px] text-slate-500">{item.label}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        className="overflow-hidden rounded-xl border border-slate-200 shadow-sm"
        style={{ height }}
      >
        <MapContainer
          center={[effectiveCenter.lat, effectiveCenter.lng]}
          zoom={zoom}
          scrollWheelZoom
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewportSync center={effectiveCenter} zoom={zoom} />
          <MapClickHandler onSelect={onLocationSelect ? handleMapClick : undefined} />

          {typeof radiusKm === 'number' && radiusKm > 0 && (
            <Circle
              center={[effectiveCenter.lat, effectiveCenter.lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: '#059669',
                fillColor: '#10b981',
                fillOpacity: 0.12,
                weight: 1.5,
              }}
            />
          )}

          {selectedPoint && (
            <Marker position={[selectedPoint.lat, selectedPoint.lng]} icon={selectedMarkerIcon}>
              <Popup>Vị trí đã chọn</Popup>
            </Marker>
          )}

          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={sessionMarkerIcon}
              eventHandlers={
                marker.onClick
                  ? {
                      click: marker.onClick,
                    }
                  : undefined
              }
            >
              {(marker.title || marker.subtitle) && (
                <Popup>
                  <div className="text-xs">
                    {marker.title && <p className="font-semibold text-slate-900">{marker.title}</p>}
                    {marker.subtitle && <p className="mt-0.5 text-slate-600">{marker.subtitle}</p>}
                  </div>
                </Popup>
              )}
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default CustomMapView;
