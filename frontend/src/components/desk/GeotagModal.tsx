import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, ExternalLink, Link2, Sliders, Loader2 } from 'lucide-react';
import type { MediaAsset } from '../../types';
import { parseMapUrlOrCoords, resolveMapUrlViaBackend } from '../../utils/mapParser';

interface GeotagModalProps {
  asset: MediaAsset;
  isOpen: boolean;
  onClose: () => void;
  onGeotagSuccess: (updated: MediaAsset) => void;
}

export const GeotagModal: React.FC<GeotagModalProps> = ({
  asset,
  isOpen,
  onClose,
  onGeotagSuccess,
}) => {
  const [mapInput, setMapInput] = useState<string>('');
  const [lat, setLat] = useState<string>(
    asset.telemetry?.gps_latitude !== undefined && asset.telemetry?.gps_latitude !== null
      ? asset.telemetry.gps_latitude.toString()
      : ''
  );
  const [lng, setLng] = useState<string>(
    asset.telemetry?.gps_longitude !== undefined && asset.telemetry?.gps_longitude !== null
      ? asset.telemetry.gps_longitude.toString()
      : ''
  );
  const [locationName, setLocationName] = useState<string>('');
  const [showManualFields, setShowManualFields] = useState<boolean>(false);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const resolveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (asset.telemetry?.has_gps && asset.telemetry.gps_latitude != null && asset.telemetry.gps_longitude != null) {
      setLat(asset.telemetry.gps_latitude.toString());
      setLng(asset.telemetry.gps_longitude.toString());
      setMapInput(`${asset.telemetry.gps_latitude}, ${asset.telemetry.gps_longitude}`);
    } else {
      setLat('');
      setLng('');
      setMapInput('');
    }
    setError(null);
    setIsResolving(false);
  }, [asset.public_id, asset.telemetry?.has_gps, asset.telemetry?.gps_latitude, asset.telemetry?.gps_longitude]);

  useEffect(() => {
    return () => {
      if (resolveDebounceRef.current) clearTimeout(resolveDebounceRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleMapInputChange = (val: string) => {
    setMapInput(val);
    setError(null);
    if (resolveDebounceRef.current) clearTimeout(resolveDebounceRef.current);

    const trimmed = val.trim();
    if (!trimmed) {
      setLat('');
      setLng('');
      setIsResolving(false);
      return;
    }

    // 1. Try instant synchronous regex parsing
    const parsed = parseMapUrlOrCoords(trimmed);
    if (parsed) {
      setLat(parsed.lat.toFixed(6));
      setLng(parsed.lng.toFixed(6));
      setIsResolving(false);
      return;
    }

    // 2. If it's a URL (shortened maps.app.goo.gl or full link), resolve via backend
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setIsResolving(true);
      resolveDebounceRef.current = setTimeout(async () => {
        const result = await resolveMapUrlViaBackend(trimmed);
        setIsResolving(false);
        if (result.success && result.lat !== undefined && result.lng !== undefined) {
          setLat(result.lat.toFixed(6));
          setLng(result.lng.toFixed(6));
          if (result.location_name && !locationName) {
            setLocationName(result.location_name);
          }
          setError(null);
        } else {
          setError(result.error || 'Could not extract coordinates from this link. Please check the URL or enter lat/lng below.');
          setShowManualFields(true);
        }
      }, 400);
    } else {
      setLat('');
      setLng('');
      setIsResolving(false);
    }
  };

  const currentLat = parseFloat(lat);
  const currentLng = parseFloat(lng);
  const hasValidCoords =
    !isNaN(currentLat) &&
    !isNaN(currentLng) &&
    currentLat >= -90 &&
    currentLat <= 90 &&
    currentLng >= -180 &&
    currentLng <= 180;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isResolving) return;

    let targetLat = parseFloat(lat);
    let targetLng = parseFloat(lng);

    // If coordinates are not ready yet, but a URL is present, resolve it immediately first
    if (
      (isNaN(targetLat) || isNaN(targetLng)) &&
      (mapInput.trim().startsWith('http://') || mapInput.trim().startsWith('https://'))
    ) {
      setIsResolving(true);
      setError(null);
      const result = await resolveMapUrlViaBackend(mapInput.trim());
      setIsResolving(false);
      if (result.success && result.lat !== undefined && result.lng !== undefined) {
        targetLat = result.lat;
        targetLng = result.lng;
        setLat(targetLat.toFixed(6));
        setLng(targetLng.toFixed(6));
        if (result.location_name && !locationName) {
          setLocationName(result.location_name);
        }
      } else {
        setError(result.error || 'Could not extract coordinates from link. Please enter coordinates directly below.');
        setShowManualFields(true);
        return;
      }
    }

    if (
      isNaN(targetLat) ||
      isNaN(targetLng) ||
      targetLat < -90 ||
      targetLat > 90 ||
      targetLng < -180 ||
      targetLng > 180
    ) {
      setError('Please paste a valid map link or enter coordinates between -90 and 90, -180 and 180.');
      setShowManualFields(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/editorial/geotag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id: asset.public_id,
          lat: targetLat,
          lng: targetLng,
          location_name: locationName.trim() || undefined,
          map_url: mapInput.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to assign geotag: ${res.statusText}`);
      }

      const updatedAsset: MediaAsset = await res.json();
      onGeotagSuccess(updatedAsset);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to geotag media');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-[400px] bg-white rounded-2xl border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.12)] p-5 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Geotag Story</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Anchor this asset with map coordinates
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer -mr-1 -mt-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Primary Map Link / Coordinates Input */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Google Maps Link or Coordinates
            </label>
            <div className="relative">
              <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={mapInput}
                onChange={(e) => handleMapInputChange(e.target.value)}
                placeholder="Paste map link or 37.7749, -122.4194"
                autoFocus
                className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
              />
            </div>

            {/* Live Resolving Status */}
            {isResolving && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-blue-600 font-medium animate-in fade-in duration-100">
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                <span>Resolving location from map link...</span>
              </div>
            )}

            {/* Live Coordinates Verified Preview */}
            {!isResolving && hasValidCoords && (
              <div className="flex items-center justify-between mt-1.5 px-2.5 py-1 bg-emerald-50/80 border border-emerald-200/70 rounded-lg text-emerald-800 animate-in fade-in duration-100">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="font-mono font-medium">
                    {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${currentLat},${currentLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 text-[10px] font-semibold transition"
                  title="View on Google Maps"
                >
                  <span>Preview</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}

            {/* Error Feedback */}
            {error && (
              <div className="mt-1.5 text-[11px] text-rose-600 font-medium leading-snug animate-in fade-in duration-100">
                {error}
              </div>
            )}
          </div>

          {/* Location Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Location Label <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. City Hall Plaza, Bay Street"
              className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
            />
          </div>

          {/* Expandable Manual Fields Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowManualFields(!showManualFields)}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer transition select-none"
            >
              <Sliders className="w-3 h-3 text-slate-400" />
              <span>{showManualFields ? 'Hide manual coordinates' : 'Enter Lat / Lng directly'}</span>
            </button>

            {showManualFields && (
              <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in duration-100">
                <div>
                  <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => {
                      setLat(e.target.value);
                      setMapInput(`${e.target.value}, ${lng}`);
                    }}
                    placeholder="37.7749"
                    className="w-full bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => {
                      setLng(e.target.value);
                      setMapInput(`${lat}, ${e.target.value}`);
                    }}
                    placeholder="-122.4194"
                    className="w-full bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 px-3 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isResolving || (!hasValidCoords && !mapInput.trim().startsWith('http'))}
              className="h-8 px-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center justify-center cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : isResolving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Resolving...</span>
                </span>
              ) : (
                <span>Set Geotag</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
