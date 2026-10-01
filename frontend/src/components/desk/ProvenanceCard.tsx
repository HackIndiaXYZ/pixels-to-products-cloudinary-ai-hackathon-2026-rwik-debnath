import React, { useState, useEffect, useRef } from 'react';
import type { MediaAsset } from '../../types';
import {
  Camera,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Check,
  CircleCheck,
  CircleAlert,
  X,
  ChevronDown,
} from 'lucide-react';
import {
  CATEGORY_LIST,
  getCategoryMeta,
} from '../../utils/categories';

interface ProvenanceCardProps {
  asset: MediaAsset;
  onUpdateAsset?: (updated: MediaAsset) => void;
  onClose?: () => void;
}

export const ProvenanceCard: React.FC<ProvenanceCardProps> = ({
  asset,
  onUpdateAsset,
  onClose,
}) => {
  const [headline, setHeadline] = useState(asset.headline || 'Breaking News');
  const [incidentType, setIncidentType] = useState(asset.incident_type || 'uncategorized');
  const [urgency, setUrgency] = useState<'breaking' | 'standard'>((asset.urgency as 'breaking' | 'standard') || 'breaking');

  // News Beat Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeadline(asset.headline || 'Breaking News');
    setIncidentType(asset.incident_type || 'uncategorized');
    setUrgency((asset.urgency as 'breaking' | 'standard') || 'breaking');
  }, [asset.public_id, asset.headline, asset.incident_type, asset.urgency]);

  // Click outside and Escape handler for Beat Dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const isMetadataDirty =
    headline !== (asset.headline || 'Breaking News') ||
    incidentType !== (asset.incident_type || 'uncategorized') ||
    urgency !== ((asset.urgency as 'breaking' | 'standard') || 'breaking');

  const persistStoryMetadata = async (
    newHeadline?: string,
    newIncidentType?: string,
    newUrgency?: 'breaking' | 'standard'
  ) => {
    const finalHeadline = (newHeadline !== undefined ? newHeadline : headline).trim() || 'Breaking News';
    const finalIncidentType = newIncidentType !== undefined ? newIncidentType : incidentType;
    const finalUrgency = newUrgency !== undefined ? newUrgency : urgency;

    try {
      const res = await fetch('/api/v1/editorial/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id: asset.public_id,
          headline: finalHeadline,
          incident_type: finalIncidentType,
          urgency: finalUrgency,
        }),
      });
      if (res.ok) {
        const updated: MediaAsset = await res.json();
        if (onUpdateAsset) onUpdateAsset(updated);
      }
    } catch (err) {
      console.error('Failed to save story metadata:', err);
    }
  };

  const handleSaveMetadata = () => {
    if (onUpdateAsset) {
      onUpdateAsset({
        ...asset,
        headline,
        incident_type: incidentType,
        urgency,
      });
    }
    persistStoryMetadata(headline, incidentType, urgency);
  };

  const handleSelectCategory = (catId: string) => {
    setIncidentType(catId);
    setIsDropdownOpen(false);
    if (onUpdateAsset) {
      onUpdateAsset({
        ...asset,
        incident_type: catId,
      });
    }
    persistStoryMetadata(headline, catId, urgency);
  };

  const handleToggleUrgency = (newUrgency: 'breaking' | 'standard') => {
    setUrgency(newUrgency);
    if (onUpdateAsset) {
      onUpdateAsset({
        ...asset,
        urgency: newUrgency,
      });
    }
    persistStoryMetadata(headline, incidentType, newUrgency);
  };

  const activeCat = getCategoryMeta(incidentType);

  const { telemetry, moderation, review_status: reviewStatus } = asset;
  const fileSpecs = {
    format: asset.format,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    created_at: asset.created_at,
  };

  const timeDeltaMinutes = telemetry.time_delta_seconds
    ? (telemetry.time_delta_seconds / 60).toFixed(1)
    : null;

  const lat = telemetry.gps_latitude || 37.7749;
  const lng = telemetry.gps_longitude || -122.4194;
  const hasCoords = Boolean(telemetry.has_gps && telemetry.gps_latitude && telemetry.gps_longitude);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white select-none">
      {/* 1. Pinned Header (Clean, spacious, zero text collision) */}
      <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Story Inspector
        </span>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Review Status */}
          <div
            className={`flex items-center space-x-1.5 text-xs font-semibold select-none cursor-default ${
              reviewStatus === 'approved'
                ? 'text-emerald-600'
                : reviewStatus === 'quarantined'
                ? 'text-rose-600'
                : 'text-amber-600'
            }`}
          >
            {reviewStatus === 'approved' && <CircleCheck className="w-3.5 h-3.5" />}
            {reviewStatus === 'quarantined' && <ShieldAlert className="w-3.5 h-3.5" />}
            {reviewStatus === 'action_required' && <CircleAlert className="w-3.5 h-3.5" />}
            <span>
              {reviewStatus === 'approved'
                ? 'Ready for Wire'
                : reviewStatus === 'quarantined'
                ? 'Quarantined'
                : 'Needs Triage'}
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Close Inspector (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 min-h-0">
        {/* Section 0: Story Properties */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Story Properties
            </span>
          </div>

          {/* Story Headline */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Broadcast Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              onBlur={() => {
                if (isMetadataDirty) handleSaveMetadata();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Enter broadcast headline..."
              className="w-full bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 focus:bg-white rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Beat & Urgency Row */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* News Beat Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                News Beat
              </label>

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="w-full bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 transition font-medium cursor-pointer flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-[36px]"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${activeCat.dotColor}`} />
                  <span className="truncate">{activeCat.label}</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5 transition-transform duration-150 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Fixed Desks Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  {CATEGORY_LIST.map((c) => {
                    const isSelected = c.id === incidentType || activeCat.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCategory(c.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition text-left ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 font-semibold'
                            : 'hover:bg-slate-100 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${c.dotColor}`} />
                          <span className="truncate">{c.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Urgency Switch */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Urgency
              </label>
              <div className="flex items-center p-0.5 bg-slate-100/90 rounded-xl text-xs font-semibold h-[36px] border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => handleToggleUrgency('breaking')}
                  className={`flex-1 h-full rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1.5 select-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border ${
                    urgency === 'breaking'
                      ? 'bg-white text-rose-600 border-slate-200/80 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 font-medium border-transparent'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      urgency === 'breaking' ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'
                    } shrink-0`}
                  />
                  <span>Breaking</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleUrgency('standard')}
                  className={`flex-1 h-full rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1.5 select-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border ${
                    urgency === 'standard'
                      ? 'bg-white text-slate-800 border-slate-200/80 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50 font-medium border-transparent'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      urgency === 'standard' ? 'bg-slate-500' : 'bg-slate-300'
                    } shrink-0`}
                  />
                  <span>Standard</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Provenance & Audit Specification Grid */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Provenance & Telemetry
            </span>
          </div>

          <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
            {/* Camera / Device */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                <span>Camera / Device</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[190px]">
                  {telemetry.make ? `${telemetry.make} ${telemetry.model || ''}` : 'Direct Smartphone Ingest'}
                </span>
              </div>
            </div>

            {/* Capture Delta */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Capture Delta</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {telemetry.time_delta_seconds && telemetry.time_delta_seconds > 7200 ? (
                  <span className="text-[11px] font-semibold text-amber-600 flex items-center space-x-1" title="EXIF timestamp delta exceeds 2-hour breaking news threshold">
                    <CircleAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Stale ({timeDeltaMinutes}m &gt; 2h)</span>
                  </span>
                ) : (
                  <span className="font-semibold text-slate-800 text-[11px]">
                    {timeDeltaMinutes ? `${timeDeltaMinutes}m ago` : 'Real-Time Ingest'}
                  </span>
                )}
              </div>
            </div>

            {/* Broadcast Rights Waiver */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Broadcast Rights</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span
                  className="font-semibold text-emerald-600 text-[11px]"
                  title={`Waiver Signed • Submitter IP: ${telemetry.submitter_ip || 'Verified'}`}
                >
                  Irrevocable License
                </span>
              </div>
            </div>

            {/* Content Safety */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Content Safety</span>
              </div>
              <span
                className={`font-semibold text-[11px] ${
                  moderation.status === 'approved'
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {moderation.status === 'approved' ? 'Passed (Clean)' : moderation.status}
              </span>
            </div>

            {/* Incident Location */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Incident Site</span>
              </div>
              <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                <span className="text-slate-800 font-medium">
                  {lat.toFixed(4)}° N, {lng.toFixed(4)}° W
                </span>
                {hasCoords && (
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50 transition"
                    title="Open location on Google Maps"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Pinned Footer (Technical Media Specs & UTC Timestamp) */}
      {fileSpecs && (
        <div className="shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center space-x-1.5">
            {fileSpecs.width && fileSpecs.height && (
              <span>{fileSpecs.width} × {fileSpecs.height}</span>
            )}
            {fileSpecs.format && (
              <>
                <span className="text-slate-300">•</span>
                <span className="uppercase font-semibold">{fileSpecs.format}</span>
              </>
            )}
            {fileSpecs.bytes && (
              <>
                <span className="text-slate-300">•</span>
                <span>{(fileSpecs.bytes / (1024 * 1024)).toFixed(1)} MB</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1.5 font-semibold text-slate-600">
            <span className="text-slate-400 font-normal">Wire Ingest</span>
            <span className="text-slate-300 font-normal">•</span>
            {fileSpecs.created_at && (
              <span>
                {new Date(fileSpecs.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}{' '}
                UTC
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
