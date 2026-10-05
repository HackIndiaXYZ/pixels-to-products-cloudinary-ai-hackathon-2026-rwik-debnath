import React, { useState, useEffect, useRef } from 'react';
import type { MediaAsset, StoryPackage } from '../../types';
import {
  Camera,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  CircleAlert,
  X,
  ChevronDown,
  Download,
  Copy,
  Layers,
  Pencil,
  Tv,
  FileCode,
  Upload,
  Smartphone,
  LayoutGrid,
  Loader2,
} from 'lucide-react';
import {
  CATEGORY_LIST,
  getCategoryMeta,
} from '../../utils/categories';
import { GeotagModal } from './GeotagModal';

interface ProvenanceCardProps {
  asset: MediaAsset;
  allAssets?: MediaAsset[];
  packages?: StoryPackage[];
  onAssignPackage?: (publicId: string, eventId: string | null, eventTitle?: string | null) => Promise<void>;
  onUpdateAsset?: (updated: MediaAsset) => void;
  onClose?: () => void;
}

export const ProvenanceCard: React.FC<ProvenanceCardProps> = ({
  asset,
  allAssets,
  packages,
  onAssignPackage,
  onUpdateAsset,
  onClose,
}) => {
  const [headline, setHeadline] = useState(asset.headline || 'Breaking News');
  const [incidentType, setIncidentType] = useState(asset.incident_type || 'uncategorized');
  const [urgency, setUrgency] = useState<'breaking' | 'standard'>((asset.urgency as 'breaking' | 'standard') || 'breaking');
  const [eventTitle, setEventTitle] = useState(asset.event_title || '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGeotagModalOpen, setIsGeotagModalOpen] = useState(false);

  // Broadcast Station Branding state
  const [brandTheme, setBrandTheme] = useState<string>(asset.brand_theme || 'global_wire');
  const [customStrapId, setCustomStrapId] = useState<string | null>(asset.custom_strap_id || null);
  const [customBugInput, setCustomBugInput] = useState<string>(asset.custom_strap_id || '');
  const [isApplyingBranding, setIsApplyingBranding] = useState(false);
  const [isUploadingStrap, setIsUploadingStrap] = useState(false);
  const strapFileInputRef = useRef<HTMLInputElement>(null);

  // Package Reassignment State
  const [isPackageDropdownOpen, setIsPackageDropdownOpen] = useState(false);
  const [isAssigningPackage, setIsAssigningPackage] = useState(false);
  const packageDropdownRef = useRef<HTMLDivElement>(null);

  // Compute unique active packages from packages prop and allAssets
  const availablePackages = React.useMemo(() => {
    const map = new Map<string, { event_id: string; title: string; count: number; radius_km?: number }>();
    if (packages) {
      packages.forEach((pkg) => {
        map.set(pkg.event_id, {
          event_id: pkg.event_id,
          title: pkg.event_title,
          count: 0,
          radius_km: pkg.cluster_radius_km,
        });
      });
    }
    if (allAssets) {
      allAssets.forEach((a) => {
        if (a.event_id) {
          const existing = map.get(a.event_id);
          if (existing) {
            existing.count += 1;
          } else {
            map.set(a.event_id, {
              event_id: a.event_id,
              title: a.event_title || a.headline || `Package #${a.event_id.replace(/^evt_/, '')}`,
              count: 1,
              radius_km: a.cluster_radius_km,
            });
          }
        }
      });
    }
    return Array.from(map.values());
  }, [allAssets, packages]);

  const handleCopy = (key: string, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // News Beat Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeadline(asset.headline || 'Breaking News');
    setIncidentType(asset.incident_type || 'uncategorized');
    setUrgency((asset.urgency as 'breaking' | 'standard') || 'breaking');
    setEventTitle(asset.event_title || '');
    const savedTheme = localStorage.getItem('presswire_station_theme');
    const savedBug = localStorage.getItem('presswire_station_bug');
    const activeTheme = asset.brand_theme || savedTheme || 'global_wire';
    const activeBug = asset.custom_strap_id || savedBug || null;
    setBrandTheme(activeTheme);
    setCustomStrapId(activeBug);
    setCustomBugInput(activeBug || '');
  }, [
    asset.public_id,
    asset.headline,
    asset.incident_type,
    asset.urgency,
    asset.event_title,
    asset.brand_theme,
    asset.custom_strap_id,
  ]);

  const getCustomBugThumbnailUrl = (strapId: string) => {
    const cleanId = strapId.replace(/:/g, '/');
    if (asset.secure_url && asset.secure_url.includes('/image/upload/')) {
      const [base] = asset.secure_url.split('/image/upload/');
      return `${base}/image/upload/c_fit,h_48,w_120/${cleanId}.png`;
    }
    return `https://res.cloudinary.com/f3dzrk0s/image/upload/c_fit,h_48,w_120/${cleanId}.png`;
  };

  const handleApplyCustomBug = async (bugId: string) => {
    const cleanId = bugId.trim();
    setIsApplyingBranding(true);
    try {
      if (cleanId) {
        setCustomStrapId(cleanId);
        setCustomBugInput(cleanId);
        localStorage.setItem('presswire_station_bug', cleanId);
      } else {
        setCustomStrapId(null);
        setCustomBugInput('');
        localStorage.removeItem('presswire_station_bug');
      }
      const res = await fetch('/api/v1/editorial/branding/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id: asset.public_id,
          brand_theme: brandTheme,
          custom_strap_id: cleanId,
        }),
      });
      if (res.ok) {
        const updated: MediaAsset = await res.json();
        if (onUpdateAsset) onUpdateAsset(updated);
      }
    } catch (err) {
      console.error('Failed to apply station bug:', err);
    } finally {
      setIsApplyingBranding(false);
    }
  };

  const handleRemoveCustomBug = async () => {
    setCustomBugInput('');
    await handleApplyCustomBug('');
  };

  const handleCustomStrapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingStrap(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/v1/editorial/branding/upload', {
        method: 'POST',
        body: formData,
      });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        setCustomStrapId(data.public_id);
        setCustomBugInput(data.public_id);
        localStorage.setItem('presswire_station_bug', data.public_id);
        const applyRes = await fetch('/api/v1/editorial/branding/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_id: asset.public_id,
            brand_theme: brandTheme,
            custom_strap_id: data.public_id,
          }),
        });
        if (applyRes.ok) {
          const updated: MediaAsset = await applyRes.json();
          if (onUpdateAsset) onUpdateAsset(updated);
        }
      }
    } catch (err) {
      console.error('Failed uploading custom strap:', err);
    } finally {
      setIsUploadingStrap(false);
      if (strapFileInputRef.current) {
        strapFileInputRef.current.value = '';
      }
    }
  };

  const handleCopySidecar = async () => {
    try {
      const res = await fetch(`/api/v1/editorial/sidecar/${encodeURIComponent(asset.public_id)}`);
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setCopiedKey('sidecar');
        setTimeout(() => setCopiedKey(null), 2000);
      }
    } catch (err) {
      console.error('Failed to fetch sidecar metadata:', err);
    }
  };

  // Click outside and Escape handler for Package Dropdown
  useEffect(() => {
    if (!isPackageDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (packageDropdownRef.current && !packageDropdownRef.current.contains(e.target as Node)) {
        setIsPackageDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPackageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPackageDropdownOpen]);

  const handleAssignTo = async (targetEventId: string | null, targetTitle?: string | null) => {
    if (!onAssignPackage) return;
    setIsAssigningPackage(true);
    setIsPackageDropdownOpen(false);
    try {
      await onAssignPackage(asset.public_id, targetEventId, targetTitle);
    } catch (err) {
      console.error('Failed to assign package:', err);
    } finally {
      setIsAssigningPackage(false);
    }
  };

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
    urgency !== ((asset.urgency as 'breaking' | 'standard') || 'breaking') ||
    eventTitle !== (asset.event_title || '');

  const persistStoryMetadata = async (
    newHeadline?: string,
    newIncidentType?: string,
    newUrgency?: 'breaking' | 'standard',
    newEventTitle?: string
  ) => {
    const finalHeadline = (newHeadline !== undefined ? newHeadline : headline).trim() || 'Breaking News';
    const finalIncidentType = newIncidentType !== undefined ? newIncidentType : incidentType;
    const finalUrgency = newUrgency !== undefined ? newUrgency : urgency;
    const finalEventTitle = (newEventTitle !== undefined ? newEventTitle : eventTitle).trim();

    try {
      const res = await fetch('/api/v1/editorial/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id: asset.public_id,
          headline: finalHeadline,
          incident_type: finalIncidentType,
          urgency: finalUrgency,
          event_id: asset.event_id,
          event_title: finalEventTitle,
          cluster_radius_km: asset.cluster_radius_km,
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
        event_title: eventTitle,
      });
    }
    persistStoryMetadata(headline, incidentType, urgency, eventTitle);
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
    persistStoryMetadata(headline, catId, urgency, eventTitle);
  };

  const handleToggleUrgency = (newUrgency: 'breaking' | 'standard') => {
    setUrgency(newUrgency);
    if (onUpdateAsset) {
      onUpdateAsset({
        ...asset,
        urgency: newUrgency,
      });
    }
    persistStoryMetadata(headline, incidentType, newUrgency, eventTitle);
  };

  const activeCat = getCategoryMeta(incidentType);

  const { telemetry, moderation, review_status: reviewStatus } = asset;
  const fileSpecs = {
    format: asset.format,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    duration: asset.duration,
    frame_rate: asset.frame_rate,
    created_at: asset.created_at,
  };

  const masterUrl =
    asset.syndication_urls?.clean_master ||
    asset.syndication_urls?.broadcast_16_9_clean ||
    asset.syndication_urls?.broadcast_16_9 ||
    asset.secure_url;

  const masterDownloadUrl = masterUrl && masterUrl.includes('/upload/')
    ? masterUrl.replace('/upload/', '/upload/fl_attachment/')
    : masterUrl;

  const timeDeltaMinutes = telemetry.time_delta_seconds
    ? (telemetry.time_delta_seconds / 60).toFixed(1)
    : null;

  const lat = telemetry.gps_latitude ?? null;
  const lng = telemetry.gps_longitude ?? null;
  const hasCoords = Boolean(telemetry.has_gps && lat !== null && lng !== null);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white select-none">
      {/* 1. Pinned Header (Clean, spacious, zero text collision) */}
      <div className="flex items-center justify-between shrink-0 px-5 py-4 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Story Inspector
        </span>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Review / Processing Status */}
          <div
            className={`flex items-center space-x-1.5 text-xs font-semibold select-none cursor-default ${
              asset.processing_status === 'processing'
                ? 'text-cyan-600'
                : reviewStatus === 'approved'
                ? 'text-emerald-600'
                : reviewStatus === 'quarantined'
                ? 'text-rose-600'
                : 'text-amber-600'
            }`}
          >
            {asset.processing_status === 'processing' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                {reviewStatus === 'approved' && <ShieldCheck className="w-3.5 h-3.5" />}
                {reviewStatus === 'quarantined' && <ShieldAlert className="w-3.5 h-3.5" />}
                {reviewStatus === 'action_required' && <CircleAlert className="w-3.5 h-3.5" />}
                <span>
                  {reviewStatus === 'approved'
                    ? 'Ready for Wire'
                    : reviewStatus === 'quarantined'
                    ? 'Quarantined'
                    : 'Needs Triage'}
                </span>
              </>
            )}
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
      <div className="flex-1 overflow-y-auto modern-scrollbar px-5 py-5 space-y-5 min-h-0">
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
              className="w-full bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 focus:bg-white rounded-xl px-3.5 py-2 text-[13px] font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
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
                        {isSelected && <span className="text-[10px] font-semibold text-blue-600 shrink-0">Selected</span>}
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

          {/* Autonomous Event Package Cluster / Assignment */}
          <div className="relative" ref={packageDropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-700">
                Package Dossier
              </span>
              {onAssignPackage && (
                <button
                  type="button"
                  disabled={isAssigningPackage}
                  onClick={() => setIsPackageDropdownOpen((prev) => !prev)}
                  className="p-1 -mr-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer disabled:opacity-50 flex items-center"
                  title={asset.event_id ? 'Change or detach package' : 'Assign to package dossier'}
                >
                  <Pencil className="w-3 h-3 text-slate-400 hover:text-slate-700" />
                </button>
              )}
            </div>

            {asset.event_id ? (
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-800 truncate" title={eventTitle || headline}>
                    {eventTitle || headline}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                  #{asset.event_id.replace(/^evt_/, '')}
                </span>
              </div>
            ) : (
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-slate-500">
                  <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px] font-medium text-slate-600">Standalone Wire Story</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Independent</span>
              </div>
            )}

            {/* Package Selector Dropdown Menu */}
            {isPackageDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-56 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Wire Assignment
                </div>
                
                {/* Detach Option */}
                <button
                  type="button"
                  onClick={() => handleAssignTo(null)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition text-left ${
                    !asset.event_id
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'hover:bg-slate-100 text-slate-700 font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Standalone Story (Detach)</span>
                  </div>
                </button>

                {availablePackages.length > 0 && (
                  <>
                    <div className="border-t border-slate-100 my-1 pt-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Active Dossiers ({availablePackages.length})
                    </div>
                    {availablePackages.map((pkg) => {
                      const isSelected = asset.event_id === pkg.event_id;
                      return (
                        <button
                          key={pkg.event_id}
                          type="button"
                          onClick={() => handleAssignTo(pkg.event_id, pkg.title)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition text-left ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 font-semibold'
                              : 'hover:bg-slate-100 text-slate-700 font-medium'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="truncate text-[11px]">{pkg.title}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {pkg.count} item{pkg.count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
                {availablePackages.length === 0 && (
                  <div className="px-2.5 py-2 text-[11px] text-slate-400 italic">
                    No active packages available yet. Create one in Wire Queue.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Provenance & Audit Specification Grid */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Provenance & Telemetry
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Cloudinary EXIF/IPTC
            </span>
          </div>

          {/* Compliance & Trust Verification Strip */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-lg px-2 py-1.5 text-center">
              <div className="flex items-center justify-center space-x-1 text-emerald-700">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span className="text-[10px] font-bold">C2PA</span>
              </div>
              <span className="text-[9px] text-emerald-600/90 font-medium block">Hardware Proof</span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-lg px-2 py-1.5 text-center">
              <div className="flex items-center justify-center space-x-1 text-emerald-700">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span className="text-[10px] font-bold">Rights</span>
              </div>
              <span className="text-[9px] text-emerald-600/90 font-medium block">Irrevocable</span>
            </div>

            <div className={`border rounded-lg px-2 py-1.5 text-center ${
              moderation.status === 'approved'
                ? 'bg-emerald-50/60 border-emerald-200/60'
                : 'bg-rose-50/60 border-rose-200/60'
            }`}>
              <div className={`flex items-center justify-center space-x-1 ${
                moderation.status === 'approved' ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {moderation.status === 'approved' ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                ) : (
                  <CircleAlert className="w-3 h-3 text-rose-600" />
                )}
                <span className="text-[10px] font-bold">Safety</span>
              </div>
              <span className={`text-[9px] font-medium block truncate max-w-[85px] mx-auto ${
                moderation.status === 'approved' ? 'text-emerald-600/90' : 'text-rose-600 font-bold'
              }`} title={moderation.categories?.join(', ') || moderation.status}>
                {moderation.status === 'approved' 
                  ? 'Clean Feed' 
                  : moderation.confidence 
                  ? `${Math.round(moderation.confidence * 100)}% Flag` 
                  : moderation.status}
              </span>
            </div>
          </div>

          <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
            {/* Camera / Device */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                <span>Sensor / Device</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[190px]">
                  {telemetry.make ? `${telemetry.make} ${telemetry.model || ''}` : 'Unspecified Device'}
                </span>
              </div>
            </div>

            {/* Capture Delta */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Capture Timestamp</span>
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

            {/* Incident Location */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>GPS Coordinates</span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                {hasCoords && lat !== null && lng !== null ? (
                  <>
                    <span className="text-slate-800 font-medium">
                      {lat.toFixed(4)}° N, {lng.toFixed(4)}° W
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${lat},${lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50 transition"
                      title="Open location on Google Maps"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsGeotagModalOpen(true)}
                      className="text-[10px] font-sans font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-1"
                      title="Edit location"
                    >
                      Edit
                    </button>
                  </>
                ) : (
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400 font-normal italic font-sans text-[11px]">
                      No GPS Tagged
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsGeotagModalOpen(true)}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[10px] font-sans font-semibold transition cursor-pointer flex items-center space-x-1 border border-blue-200/60 shadow-2xs"
                      title="Assign GPS location manually"
                    >
                      <MapPin className="w-2.5 h-2.5" />
                      <span>Set Location</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Playout & Syndication Deliverables */}
        <div className="space-y-3 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Broadcast Playout & Syndication
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Zero-Storage CDN
            </span>
          </div>

          {/* Master Download Package */}
          <a
            href={masterDownloadUrl}
            download
            className="w-full h-8.5 bg-white hover:bg-slate-50 text-slate-800 hover:text-slate-950 border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-2xs cursor-pointer active:scale-98"
            title="Download full-resolution clean master for broadcast playout server"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="leading-none">Download Clean Master</span>
          </a>

          {/* Station Watermark Bug Field */}
          <div className="space-y-1.5 pt-0.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
              Station Watermark Bug
            </div>

            <div className="flex items-center space-x-1.5">
              {customStrapId && (
                <div
                  className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center p-0.5 shrink-0 overflow-hidden shadow-2xs"
                  title={`Station Logo: ${customStrapId}`}
                >
                  <img
                    src={getCustomBugThumbnailUrl(customStrapId)}
                    alt="Station Bug"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customBugInput}
                  onChange={(e) => setCustomBugInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCustomBug(customBugInput);
                    }
                  }}
                  placeholder="Enter logo ID or upload PNG..."
                  className="w-full h-8 bg-slate-50/80 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-slate-400 rounded-xl px-2.5 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none transition shadow-2xs"
                />
              </div>

              {customBugInput.trim() !== (customStrapId || '') && (
                <button
                  type="button"
                  onClick={() => handleApplyCustomBug(customBugInput)}
                  disabled={isApplyingBranding}
                  className="h-8 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition cursor-pointer shrink-0 disabled:opacity-50 shadow-2xs"
                  title="Apply logo ID"
                >
                  Apply
                </button>
              )}

              {customStrapId ? (
                <button
                  type="button"
                  onClick={handleRemoveCustomBug}
                  disabled={isApplyingBranding}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
                  title="Remove station logo"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => strapFileInputRef.current?.click()}
                  disabled={isApplyingBranding || isUploadingStrap}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0"
                  title="Upload transparent PNG/SVG logo"
                >
                  <Upload className="w-4 h-4" />
                </button>
              )}

              <input
                ref={strapFileInputRef}
                type="file"
                accept="image/png,image/webp,image/svg+xml"
                onChange={handleCustomStrapUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Syndication Feeds Grid (16:9 TV, 9:16 Reel, 1:1 Card) */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  '16_9',
                  customStrapId
                    ? (asset.syndication_urls?.broadcast_16_9_branded || asset.syndication_urls?.broadcast_16_9)
                    : (asset.syndication_urls?.broadcast_16_9_clean || asset.syndication_urls?.broadcast_16_9)
                )
              }
              className="h-8 bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/80 rounded-xl px-2 text-[11px] font-medium text-slate-700 flex items-center justify-between transition cursor-pointer active:scale-98"
              title={customStrapId ? 'Copy 16:9 Branded Broadcast feed URL' : 'Copy 16:9 Clean Broadcast feed URL'}
            >
              <div className="flex items-center space-x-1.5 truncate">
                <Tv className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">16:9 TV</span>
              </div>
              {copiedKey === '16_9' ? (
                <span className="text-[10px] font-semibold text-blue-600 shrink-0 ml-1">Copied</span>
              ) : (
                <Copy className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleCopy('9_16', asset.syndication_urls?.social_9_16)}
              className="h-8 bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/80 rounded-xl px-2 text-[11px] font-medium text-slate-700 flex items-center justify-between transition cursor-pointer active:scale-98"
              title="Copy 9:16 Vertical Reel URL"
            >
              <div className="flex items-center space-x-1.5 truncate">
                <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">9:16 Reel</span>
              </div>
              {copiedKey === '9_16' ? (
                <span className="text-[10px] font-semibold text-blue-600 shrink-0 ml-1">Copied</span>
              ) : (
                <Copy className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleCopy('1_1', asset.syndication_urls?.feed_1_1)}
              className="h-8 bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/80 rounded-xl px-2 text-[11px] font-medium text-slate-700 flex items-center justify-between transition cursor-pointer active:scale-98"
              title="Copy 1:1 Wire Index Card URL"
            >
              <div className="flex items-center space-x-1.5 truncate">
                <LayoutGrid className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">1:1 Card</span>
              </div>
              {copiedKey === '1_1' ? (
                <span className="text-[10px] font-semibold text-blue-600 shrink-0 ml-1">Copied</span>
              ) : (
                <Copy className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
              )}
            </button>
          </div>

          {/* Sidecar JSON */}
          <button
            type="button"
            onClick={handleCopySidecar}
            className="w-full h-7.5 bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl px-2.5 text-[11px] font-medium text-slate-600 hover:text-slate-800 flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-98"
            title="Copy IPTC / CG automation sidecar JSON"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Copy Broadcast Sidecar (IPTC / JSON)</span>
            {copiedKey === 'sidecar' && (
              <span className="text-[10px] font-semibold text-blue-600 shrink-0 ml-1">Copied</span>
            )}
          </button>

          {/* Syndication Tech Specs */}
          <div className="flex items-center space-x-1.5 text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-100">
            <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            <span>g_auto:subject · b_auto:predominant · f_auto, q_auto</span>
          </div>
        </div>
      </div>

      {/* 3. Pinned Footer (Technical Media Specs & UTC Timestamp) */}
      {fileSpecs && (
        <div className="shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center space-x-1.5 truncate mr-2">
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
            {fileSpecs.duration && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-700 font-semibold">{fileSpecs.duration.toFixed(1)}s{fileSpecs.frame_rate ? ` (${Math.round(fileSpecs.frame_rate)}fps)` : ''}</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1.5 font-semibold text-slate-600 shrink-0">
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

      {/* Geotag Modal */}
      {isGeotagModalOpen && (
        <GeotagModal
          asset={asset}
          isOpen={isGeotagModalOpen}
          onClose={() => setIsGeotagModalOpen(false)}
          onGeotagSuccess={(updated) => {
            if (onUpdateAsset) onUpdateAsset(updated);
          }}
        />
      )}
    </div>
  );
};
