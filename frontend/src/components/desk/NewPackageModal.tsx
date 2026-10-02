import React, { useState } from 'react';
import { Layers, X, Check, Link2, ExternalLink } from 'lucide-react';
import { CATEGORY_LIST } from '../../utils/categories';
import { parseMapUrlOrCoords } from '../../utils/mapParser';

interface NewPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPackage: { event_id: string; event_title: string }) => void;
}

const RADIUS_OPTIONS = [0.5, 1.0, 1.5, 3.0, 5.0];

export const NewPackageModal: React.FC<NewPackageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [incidentType, setIncidentType] = useState('breaking');
  const [mapInput, setMapInput] = useState('');
  const [radius, setRadius] = useState<number>(1.5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsed = parseMapUrlOrCoords(mapInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please provide a package title or headline.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/editorial/package/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_title: trimmedTitle,
          incident_type: incidentType,
          lat: parsed?.lat ?? null,
          lng: parsed?.lng ?? null,
          cluster_radius_km: radius,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create package: ${res.statusText}`);
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. City Hall Briefing, Downtown Warehouse Fire"
              autoFocus
              required
              className="w-full bg-slate-50 border border-slate-200/90 hover:border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            />
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
            {parsed && (
              <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <div className="flex items-center space-x-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Anchor Coordinates: {parsed.lat.toFixed(4)}°, {parsed.lng.toFixed(4)}°</span>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-800 font-semibold flex items-center space-x-0.5 hover:underline"
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
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating...' : 'Create Package'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
