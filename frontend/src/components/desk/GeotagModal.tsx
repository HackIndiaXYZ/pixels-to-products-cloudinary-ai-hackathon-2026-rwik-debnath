import React, { useState, useEffect } from 'react';
import { MapPin, X, Check, ExternalLink, Link2, Sliders } from 'lucide-react';
import type { MediaAsset } from '../../types';
import { parseMapUrlOrCoords } from '../../utils/mapParser';

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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [asset.public_id, asset.telemetry?.has_gps, asset.telemetry?.gps_latitude, asset.telemetry?.gps_longitude]);

  if (!isOpen) return null;

  const handleMapInputChange = (val: string) => {
    setMapInput(val);
    setError(null);
    if (!val.trim()) return;

    const parsed = parseMapUrlOrCoords(val);
    if (parsed) {
      setLat(parsed.lat.toFixed(6));
      setLng(parsed.lng.toFixed(6));
    }
  };

  const currentLat = parseFloat(lat);
  const currentLng = parseFloat(lng);
  const hasValidCoords = !isNaN(currentLat) && !isNaN(currentLng) && currentLat >= -90 && currentLat <= 90 && currentLng >= -180 && currentLng <= 180;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasValidCoords) {
      setError('Please paste a valid Google/Apple Maps link or enter valid coordinates.');
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
          lat: currentLat,
          lng: currentLng,
          location_name: locationName.trim() || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Set Story Geotag
              </h3>
              <p className="text-[11px] text-slate-500">
                Paste a map link or coordinates to anchor this asset
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Primary Map Link / Coordinates Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Google Maps URL or Coordinates
            </label>
            <div className="relative">
              <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={mapInput}
                onChange={(e) => handleMapInputChange(e.target.value)}
                placeholder="Paste Google Maps URL or coordinates..."
                autoFocus
                className="w-full bg-slate-50 border border-slate-200/90 hover:border-slate-300 focus:bg-white rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
              />
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Supports Google Maps URLs, Apple Maps, OpenStreetMap, or raw <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">lat, lng</code>.
            </p>
          </div>

          {/* Live Verified Coordinates Status */}
          {hasValidCoords && (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3 py-2 flex items-center justify-between text-xs animate-in fade-in duration-150">
              <div className="flex items-center space-x-1.5 text-emerald-800">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-[11px]">
                  Verified Coordinates:
                </span>
                <span className="font-mono text-[11px] font-medium text-emerald-950">
                  {currentLat.toFixed(4)}°, {currentLng.toFixed(4)}°
                </span>
              </div>
              <a
                href={`https://www.google.com/maps?q=${currentLat},${currentLng}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded hover:bg-emerald-100/60 transition flex items-center space-x-0.5 text-[10px] font-semibold"
                title="Preview location on Google Maps"
              >
                <span>View</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}

          {/* Optional Location Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Location Label <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. City Hall Plaza, Bay Street Entrance"
              className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Expandable Manual Fields Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowManualFields(!showManualFields)}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium flex items-center space-x-1 cursor-pointer transition"
            >
              <Sliders className="w-3 h-3 text-slate-400" />
              <span>{showManualFields ? 'Hide' : 'Show'} direct lat/lng numerical inputs</span>
            </button>

            {showManualFields && (
              <div className="grid grid-cols-2 gap-2.5 pt-2 animate-in fade-in duration-100">
                <div>
                  <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasValidCoords}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Set Geotag'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
