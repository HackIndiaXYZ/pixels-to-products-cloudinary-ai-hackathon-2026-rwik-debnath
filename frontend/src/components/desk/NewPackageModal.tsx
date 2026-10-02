import React, { useState, useEffect } from 'react';
import { Layers, X, Link2, ExternalLink, Loader2 } from 'lucide-react';
import { CATEGORY_LIST } from '../../utils/categories';
import { parseMapUrlOrCoords, resolveMapUrlViaBackend } from '../../utils/mapParser';

interface NewPackageModalProps {
  isOpen: boolean;
  existingPackages?: { event_id: string; title?: string; event_title?: string }[];
  onClose: () => void;
  onSuccess: (newPackage: { event_id: string; event_title: string }) => void;
}

const RADIUS_OPTIONS = [0.5, 1.0, 1.5, 3.0, 5.0];

export const NewPackageModal: React.FC<NewPackageModalProps> = ({
  isOpen,
  existingPackages = [],
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [incidentType, setIncidentType] = useState('uncategorized');
  const [mapInput, setMapInput] = useState('');
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [radius, setRadius] = useState<number>(1.5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = mapInput.trim();
    if (!trimmed) {
      setGeoCoords(null);
      setIsResolvingUrl(false);
      return;
    }

    const syncParsed = parseMapUrlOrCoords(trimmed);
    if (syncParsed) {
      setGeoCoords({ lat: syncParsed.lat, lng: syncParsed.lng });
      setIsResolvingUrl(false);
      return;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setIsResolvingUrl(true);
      const timer = setTimeout(async () => {
        try {
          const res = await resolveMapUrlViaBackend(trimmed);
          if (res.success && res.lat !== undefined && res.lng !== undefined) {
            setGeoCoords({ lat: res.lat, lng: res.lng });
          } else {
            setGeoCoords(null);
          }
        } catch {
          setGeoCoords(null);
        } finally {
          setIsResolvingUrl(false);
        }
      }, 350);

      return () => clearTimeout(timer);
    } else {
      setGeoCoords(null);
      setIsResolvingUrl(false);
    }
  }, [mapInput]);

  if (!isOpen) return null;

  const isDuplicateTitle = Boolean(
    title.trim() &&
    existingPackages?.some((p) => {
      const name = (p.title || p.event_title || '').trim().toLowerCase();
      return name === title.trim().toLowerCase();
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please provide a package title or headline.');
      return;
    }

    if (isDuplicateTitle) {
      setError(`A package named "${trimmedTitle}" already exists. Package titles must be unique.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const effectiveIncidentType =
      incidentType && incidentType.trim() && incidentType !== 'breaking'
        ? incidentType
        : 'uncategorized';

    try {
      let effectiveCoords = geoCoords;
      if (!effectiveCoords && mapInput.trim().startsWith('http')) {
        const res = await resolveMapUrlViaBackend(mapInput.trim());
        if (res.success && res.lat !== undefined && res.lng !== undefined) {
          effectiveCoords = { lat: res.lat, lng: res.lng };
        }
      }

      const res = await fetch('/api/v1/editorial/package/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_title: trimmedTitle,
          incident_type: effectiveIncidentType,
          lat: effectiveCoords?.lat ?? null,
          lng: effectiveCoords?.lng ?? null,
          cluster_radius_km: radius,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Failed to create package: ${res.statusText}`);
      }

      const data = await res.json();
      onSuccess({
        event_id: data.event_id,
        event_title: data.event_title,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create package');
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
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                New Story Package
              </h3>
              <p className="text-[11px] text-slate-500">
                Create an event dossier to group multi-angle wire media
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

          {/* Package Title */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Package Title / Headline <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. City Hall Briefing, Downtown Warehouse Fire"
              autoFocus
              required
              className={`w-full bg-slate-50 border hover:border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs ${
                isDuplicateTitle ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200/90'
              }`}
            />
            {isDuplicateTitle && (
              <p className="text-[11px] text-amber-600 font-medium mt-1">
                A package with this headline already exists. Package titles must be unique.
              </p>
            )}
          </div>

          {/* News Beat */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              News Beat
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORY_LIST.map((c) => {
                const isSelected = incidentType === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setIncidentType(c.id)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer flex items-center space-x-2 text-left ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 border-blue-300 font-semibold shadow-2xs'
                        : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dotColor}`} />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Geo Anchor */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Geo Anchor <span className="text-slate-400 font-normal">(optional: auto-groups field GPS uploads)</span>
            </label>
            <div className="relative">
              <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={mapInput}
                onChange={(e) => setMapInput(e.target.value)}
                placeholder="Paste Google Maps URL or coordinates..."
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
            {isResolvingUrl && (
              <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                <span>Resolving map coordinates...</span>
              </div>
            )}
            {!isResolvingUrl && geoCoords && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg">
                <span className="font-mono text-[10.5px] text-slate-700">
                  {geoCoords.lat.toFixed(5)}°, {geoCoords.lng.toFixed(5)}°
                </span>
                <a
                  href={`https://www.google.com/maps?q=${geoCoords.lat},${geoCoords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                >
                  <span>Map</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
          </div>

          {/* Cluster Perimeter Radius */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Cluster Perimeter Radius
            </label>
            <div className="flex items-center space-x-1.5">
              {RADIUS_OPTIONS.map((r) => {
                const isSelected = radius === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadius(r)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {r} km
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting || !title.trim() || isDuplicateTitle}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Creating...' : 'Create Package'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
