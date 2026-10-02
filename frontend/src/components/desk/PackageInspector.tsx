import React, { useState, useEffect, useRef } from 'react';
import type { MediaAsset } from '../../types';
import {
  Layers,
  X,
  Lock,
  Trash2,
  Check,
  ChevronDown,
  Film,
  ImageIcon,
  Copy,
} from 'lucide-react';
import {
  CATEGORY_LIST,
  getCategoryMeta,
} from '../../utils/categories';

interface PackageInspectorProps {
  packageId: string;
  packageTitle: string;
  incidentType: string;
  clusterRadiusKm: number;
  packageWindowHours?: number;
  packageStatus?: 'active' | 'concluded' | 'locked';
  assets: MediaAsset[];
  onUpdatePackage: (eventId: string, updates: {
    event_title?: string;
    incident_type?: string;
    cluster_radius_km?: number;
    package_window_hours?: number;
    package_status?: 'active' | 'concluded';
  }) => Promise<void>;
  onDisbandPackage: (eventId: string) => Promise<void>;
  onDetachAsset: (publicId: string) => Promise<void>;
  onSelectAsset?: (asset: MediaAsset) => void;
  onClose: () => void;
}

export const PackageInspector: React.FC<PackageInspectorProps> = ({
  packageId,
  packageTitle,
  incidentType,
  clusterRadiusKm,
  packageWindowHours = 1.0,
  packageStatus = 'active',
  assets,
  onUpdatePackage,
  onDisbandPackage,
  onDetachAsset,
  onSelectAsset,
  onClose,
}) => {
  const [title, setTitle] = useState(packageTitle);
  const [beat, setBeat] = useState(incidentType);
  const [radius, setRadius] = useState<number>(clusterRadiusKm);
  const [windowHours, setWindowHours] = useState<number>(packageWindowHours);
  const [status, setStatus] = useState<'active' | 'concluded'>(
    packageStatus === 'locked' || packageStatus === 'concluded' ? 'concluded' : 'active'
  );
  const [isBeatDropdownOpen, setIsBeatDropdownOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const beatDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(packageTitle);
    setBeat(incidentType);
    setRadius(clusterRadiusKm);
    setWindowHours(packageWindowHours);
    setStatus(packageStatus === 'locked' || packageStatus === 'concluded' ? 'concluded' : 'active');
  }, [packageTitle, incidentType, clusterRadiusKm, packageWindowHours, packageStatus]);

  // Click outside for beat dropdown
  useEffect(() => {
    if (!isBeatDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (beatDropdownRef.current && !beatDropdownRef.current.contains(e.target as Node)) {
        setIsBeatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBeatDropdownOpen]);

  const activeBeatMeta = getCategoryMeta(beat);

  const handleSaveTitle = async () => {
    if (title.trim() === packageTitle) return;
    setIsUpdating(true);
    try {
      await onUpdatePackage(packageId, { event_title: title.trim() });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectBeat = async (catId: string) => {
    setBeat(catId);
    setIsBeatDropdownOpen(false);
    setIsUpdating(true);
    try {
      await onUpdatePackage(packageId, { incident_type: catId });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRadiusChange = async (val: number) => {
    setRadius(val);
    await onUpdatePackage(packageId, { cluster_radius_km: val });
  };

  const handleWindowChange = async (hours: number) => {
    setWindowHours(hours);
    await onUpdatePackage(packageId, { package_window_hours: hours });
  };

  const handleToggleStatus = async () => {
    const nextStatus = status === 'active' ? 'concluded' : 'active';
    setStatus(nextStatus);
    setIsUpdating(true);
    try {
      await onUpdatePackage(packageId, { package_status: nextStatus });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisband = async () => {
    if (window.confirm(`Disband package "${packageTitle}"? All ${assets.length} items will become standalone stories.`)) {
      await onDisbandPackage(packageId);
      onClose();
    }
  };

  const handleCopyManifest = () => {
    const manifest = {
      event_id: packageId,
      event_title: title,
      beat: activeBeatMeta.label,
      cluster_radius_km: radius,
      ingest_window_hours: windowHours,
      status,
      asset_count: assets.length,
      assets: assets.map((a) => ({
        public_id: a.public_id,
        headline: a.headline,
        resource_type: a.resource_type,
        created_at: a.created_at,
        telemetry: a.telemetry,
        syndication_urls: a.syndication_urls,
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
    setCopiedKey('manifest');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 text-xs overflow-hidden">
      {/* 1. Sleek Header Row */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 leading-tight">
              Package Dossier
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              #{packageId.replace(/^evt_/, '')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Minimal Segmented Status Control */}
          <div className="inline-flex p-0.5 rounded-lg bg-slate-200/70 border border-slate-200/80 text-[11px]">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => status !== 'active' && handleToggleStatus()}
              className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
                status === 'active'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => status !== 'concluded' && handleToggleStatus()}
              className={`px-2.5 py-0.5 rounded-md transition cursor-pointer flex items-center space-x-1 ${
                status === 'concluded'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Lock className="w-2.5 h-2.5 text-slate-500" />
              <span>Concluded</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
            title="Close package inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto modern-scrollbar p-4 space-y-3.5 min-h-0">
        {/* Editorial Headline & News Beat */}
        <div className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Headline
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Package headline..."
              className="w-full bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            />
          </div>

          {/* News Beat Dropdown */}
          <div className="relative" ref={beatDropdownRef}>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              News Beat
            </label>
            <button
              type="button"
              onClick={() => setIsBeatDropdownOpen((prev) => !prev)}
              className="w-full bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 transition font-medium cursor-pointer flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-[36px]"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${activeBeatMeta.dotColor}`} />
                <span className="truncate">{activeBeatMeta.label}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5 transition-transform duration-150 ${
                  isBeatDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isBeatDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                {CATEGORY_LIST.map((c) => {
                  const isSelected = c.id === beat || activeBeatMeta.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectBeat(c.id)}
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
        </div>

        {/* Section: Spatiotemporal Perimeter (Symmetrical Twin Sliders) */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Spatiotemporal Perimeter
          </div>

          {/* Slider 1: Clustering Radius */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Clustering Radius</span>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={radius}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      setRadius(val);
                      if (val >= 0.1 && val <= 10.0) handleRadiusChange(val);
                    }
                  }}
                  onBlur={() => {
                    const clamped = Math.min(10.0, Math.max(0.1, radius));
                    handleRadiusChange(clamped);
                  }}
                  className="w-12 h-5 bg-white border border-slate-200 rounded px-1 text-center text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] font-medium text-slate-400">km</span>
              </div>
            </div>

            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              value={radius}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                handleRadiusChange(val);
              }}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-400 select-none">
              <span>0.1 km</span>
              <span>5.0 km</span>
              <span>10.0 km</span>
            </div>
          </div>

          {/* Slider 2: Ingestion Time Window */}
          <div className="space-y-1.5 pt-2.5 border-t border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Ingestion Time Window</span>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="0.5"
                  max="24.0"
                  step="0.5"
                  value={windowHours}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      setWindowHours(val);
                      if (val >= 0.5 && val <= 24.0) handleWindowChange(val);
                    }
                  }}
                  onBlur={() => {
                    const clamped = Math.min(24.0, Math.max(0.5, windowHours));
                    handleWindowChange(clamped);
                  }}
                  className="w-12 h-5 bg-white border border-slate-200 rounded px-1 text-center text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] font-medium text-slate-400">hrs</span>
              </div>
            </div>

            <input
              type="range"
              min="0.5"
              max="24.0"
              step="0.5"
              value={windowHours}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                handleWindowChange(val);
              }}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-400 select-none">
              <span>0.5 h (30m)</span>
              <span>12.0 h</span>
              <span>24.0 h (All Day)</span>
            </div>
          </div>
        </div>

        {/* Section: Member Takes & Angles Gallery */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Grouped Takes & Angles ({assets.length})
          </div>

          <div className="space-y-1.5">
            {assets.map((asset) => {
              const thumbUrl =
                asset.resource_type === 'video'
                  ? asset.secure_url?.includes('/video/upload/')
                    ? asset.secure_url.replace('/video/upload/', '/video/upload/so_0,c_fill,ar_1:1,w_100,h_100/').replace(/\.(mp4|mov|webm)$/i, '.jpg')
                    : asset.syndication_urls?.feed_1_1 && !asset.syndication_urls.feed_1_1.endsWith('.mp4')
                    ? asset.syndication_urls.feed_1_1
                    : asset.secure_url?.replace(/\.(mp4|mov|webm)$/i, '.jpg')
                  : asset.secure_url || asset.syndication_urls?.feed_1_1;

              return (
                <div
                  key={asset.public_id}
                  onClick={() => onSelectAsset && onSelectAsset(asset)}
                  className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-xl p-2 flex items-center space-x-2.5 transition cursor-pointer group shadow-2xs"
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 shrink-0 flex items-center justify-center relative">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                    ) : asset.resource_type === 'video' ? (
                      <Film className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {asset.headline || asset.public_id}
                    </p>
                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                      <span>{new Date(asset.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {asset.telemetry?.make && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[120px]">{asset.telemetry.make}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Detach Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDetachAsset(asset.public_id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer shrink-0"
                    title="Detach from package into standalone story"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Pinned Footer Actions */}
      <div className="shrink-0 px-4 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleCopyManifest}
          className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 font-semibold border border-slate-200/80 transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
          title="Copy package manifest JSON"
        >
          {copiedKey === 'manifest' ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Copied JSON</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Package JSON</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDisband}
          className="px-3 py-1.5 rounded-lg text-rose-700 hover:text-rose-800 hover:bg-rose-50 font-semibold border border-rose-200/80 transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
          title="Disband package and restore all items as standalone stories"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          <span>Disband Package</span>
        </button>
      </div>
    </div>
  );
};
