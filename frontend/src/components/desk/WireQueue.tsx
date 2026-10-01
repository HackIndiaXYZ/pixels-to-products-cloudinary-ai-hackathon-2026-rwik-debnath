import React, { useState, useRef, useEffect } from 'react';
import type { MediaAsset } from '../../types';
import {
  Film,
  Image as ImageIcon,
  Search,
  AlertCircle,
  RefreshCw,
  Trash2,
  Archive,
  ArchiveRestore,
  UploadCloud,
  Check,
  X,
  ArrowUpDown,
  ChevronDown,
  SlidersHorizontal,
  Users,
  ShieldAlert,
  Video,
} from 'lucide-react';
import { CATEGORY_LIST, getCategoryMeta } from '../../utils/categories';
import { WireContextMenu } from './WireContextMenu';

const BEAT_BORDER_MAP: Record<string, string> = {
  public_safety: 'border-l-amber-500',
  severe_weather: 'border-l-sky-500',
  politics_civic: 'border-l-purple-500',
  transit: 'border-l-blue-500',
  metro_local: 'border-l-emerald-500',
  uncategorized: 'border-l-slate-400',
};

type SortOption = 'newest' | 'oldest' | 'urgency' | 'faces';

const SORT_OPTIONS: { id: SortOption; label: string; shortLabel: string }[] = [
  { id: 'newest', label: 'Newest Ingest', shortLabel: 'Newest' },
  { id: 'oldest', label: 'Oldest Ingest', shortLabel: 'Oldest' },
  { id: 'urgency', label: 'Urgency (Breaking)', shortLabel: 'Urgent' },
  { id: 'faces', label: 'Triage Priority (Faces)', shortLabel: 'Faces' },
];

interface WireQueueProps {
  assets: MediaAsset[];
  selectedId: string | null;
  onSelect: (asset: MediaAsset) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onDeleteSingle?: (public_id: string) => void;
  onDeleteBatch?: (public_ids: string[]) => void;
  onArchiveToggle?: (public_id: string, is_archived: boolean) => void;
  onBatchArchive?: (public_ids: string[], is_archived: boolean) => void;
  onSweepApproved?: () => void;
  onDirectUpload?: (files: FileList | File[]) => Promise<void>;
  isUploading?: boolean;
  onUpdateStatus?: (public_id: string, status: 'approved' | 'action_required') => void;
}

export const WireQueue: React.FC<WireQueueProps> = ({
  assets,
  selectedId,
  onSelect,
  onRefresh,
  isRefreshing = false,
  onDeleteSingle,
  onDeleteBatch,
  onArchiveToggle,
  onBatchArchive,
  onDirectUpload,
  isUploading = false,
  onUpdateStatus,
}) => {
  // Amazon-style unified filter states
  const [activeTab, setActiveTab] = useState<'all' | 'triage' | 'approved' | 'archive'>('all');
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [selectedBeat, setSelectedBeat] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'breaking'>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'video' | 'image'>('all');

  // Popover menus
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; asset: MediaAsset } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close popovers on click outside or Escape
  useEffect(() => {
    if (!isSortOpen && !isFilterOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sortRef.current && !sortRef.current.contains(target)) {
        setIsSortOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(target)) {
        setIsFilterOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSortOpen(false);
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSortOpen, isFilterOpen]);

  const liveAssets = assets.filter((a) => !a.is_archived);
  const archiveAssets = assets.filter((a) => a.is_archived);
  const countAction = liveAssets.filter((a) => a.review_status === 'action_required').length;
  const countApproved = liveAssets.filter((a) => a.review_status === 'approved').length;

  // Active filter count
  const activeFilterCount =
    (activeTab !== 'all' ? 1 : 0) +
    (selectedBeat !== 'all' ? 1 : 0) +
    (urgencyFilter !== 'all' ? 1 : 0) +
    (formatFilter !== 'all' ? 1 : 0);

  const handleResetFilters = () => {
    setActiveTab('all');
    setSelectedBeat('all');
    setUrgencyFilter('all');
    setFormatFilter('all');
  };

  // 1. Filter by lifecycle status
  const baseAssets = activeTab === 'archive'
    ? archiveAssets
    : activeTab === 'triage'
    ? liveAssets.filter((a) => a.review_status === 'action_required')
    : activeTab === 'approved'
    ? liveAssets.filter((a) => a.review_status === 'approved')
    : liveAssets;

  // 2. Filter by search, news desk, urgency, format
  const filteredAssets = baseAssets.filter((asset) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        (asset.headline && asset.headline.toLowerCase().includes(q)) ||
        asset.public_id.toLowerCase().includes(q) ||
        (asset.incident_type && asset.incident_type.toLowerCase().includes(q)) ||
        (asset.telemetry?.model && asset.telemetry.model.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    if (selectedBeat !== 'all') {
      const cat = getCategoryMeta(asset.incident_type);
      if (asset.incident_type !== selectedBeat && cat.id !== selectedBeat) {
        return false;
      }
    }

    if (urgencyFilter === 'breaking' && asset.urgency !== 'breaking') {
      return false;
    }

    if (formatFilter === 'video' && asset.resource_type !== 'video') {
      return false;
    }
    if (formatFilter === 'image' && asset.resource_type === 'video') {
      return false;
    }

    return true;
  });

  // 3. Sort
  filteredAssets.sort((a, b) => {
    if (sortOption === 'newest') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    if (sortOption === 'oldest') {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    }
    if (sortOption === 'urgency') {
      const uA = a.urgency === 'breaking' ? 1 : 0;
      const uB = b.urgency === 'breaking' ? 1 : 0;
      if (uB !== uA) return uB - uA;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    if (sortOption === 'faces') {
      const fA = a.faces?.length || 0;
      const fB = b.faces?.length || 0;
      if (fB !== fA) return fB - fA;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    return 0;
  });

  const activeBeatMeta = selectedBeat !== 'all' ? getCategoryMeta(selectedBeat) : null;
  const allFilteredIds = filteredAssets.map((a) => a.public_id);
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  const handleToggleItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.length > 0) {
        setSelectedIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds.length]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onDirectUpload) {
        await onDirectUpload(e.dataTransfer.files);
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onDirectUpload) {
        await onDirectUpload(e.target.files);
      }
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={handleDrop}
      className={`bg-white border rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col h-full min-h-[580px] overflow-hidden relative ${
        isDraggingOver ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xl' : 'border-slate-200/80'
      }`}
    >
      {/* Hidden file picker input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Floating Drag & Drop Ingestion Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-blue-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-150">
          <UploadCloud className="w-10 h-10 mb-2 animate-bounce" />
          <p className="text-sm font-bold">Release files to ingest</p>
          <p className="text-xs text-blue-100 mt-1">Direct upload into Cloudinary wire queue</p>
        </div>
      )}

      {/* Ultra-Clean Amazon Marketplace Style Filter Bar */}
      <div className="p-3 border-b border-slate-100 space-y-2.5 shrink-0">
        {/* Tier 1: Header Row */}
        <div className="h-8 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            {selectedIds.length > 0 ? (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 bg-blue-600 border-blue-600 text-white shadow-2xs"
                  title="Deselect all (Esc)"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                </button>
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {selectedIds.length} selected
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {activeTab === 'archive' ? 'Wire Archive' : 'Live Wire'}
                </span>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                  {activeTab === 'archive' ? archiveAssets.length : liveAssets.length}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {selectedIds.length > 0 ? (
              <>
                {activeTab !== 'archive' ? (
                  onBatchArchive && (
                    <button
                      type="button"
                      onClick={() => {
                        onBatchArchive(selectedIds, true);
                        setSelectedIds([]);
                      }}
                      className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer flex items-center space-x-1"
                      title="Move selected to archive"
                    >
                      <Archive className="w-3 h-3 text-slate-500" />
                      <span>Archive</span>
                    </button>
                  )
                ) : (
                  onBatchArchive && (
                    <button
                      type="button"
                      onClick={() => {
                        onBatchArchive(selectedIds, false);
                        setSelectedIds([]);
                      }}
                      className="px-2 py-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition cursor-pointer flex items-center space-x-1"
                      title="Restore selected to live buffer"
                    >
                      <ArchiveRestore className="w-3 h-3 text-blue-600" />
                      <span>Restore</span>
                    </button>
                  )
                )}

                {onDeleteBatch && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Permanently delete ${selectedIds.length} assets from wire & Cloudinary?`)) {
                        onDeleteBatch(selectedIds);
                        setSelectedIds([]);
                      }
                    }}
                    className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition cursor-pointer flex items-center space-x-1"
                    title="Delete selected permanently"
                  >
                    <Trash2 className="w-3 h-3 text-rose-500" />
                    <span>Delete</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                  title="Clear selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                  title="Select all items for batch actions"
                >
                  Select All
                </button>

                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer active:scale-90"
                    title="Refresh Wire Feed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tier 2: Wire Search Input */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wire by headline, topic, or ID..."
            className="w-full bg-slate-100/70 hover:bg-slate-100/90 focus:bg-white border border-transparent focus:border-slate-300 rounded-lg pl-7 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Tier 3: Unified Amazon Marketplace Sort & Filter Action Row */}
        <div className="flex items-center justify-between text-xs select-none relative">
          {/* Left: Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => {
                setIsSortOpen((prev) => !prev);
                setIsFilterOpen(false);
              }}
              className={`h-7 px-2.5 rounded-lg border text-[11px] font-medium flex items-center space-x-1.5 transition cursor-pointer ${
                sortOption !== 'newest'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs font-semibold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
              }`}
              title="Sort stories"
            >
              <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Sort: {SORT_OPTIONS.find((s) => s.id === sortOption)?.shortLabel || 'Newest'}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSortOption(opt.id);
                      setIsSortOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition text-left ${
                      sortOption === opt.id
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : 'hover:bg-slate-100 text-slate-700 font-medium'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortOption === opt.id && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Amazon-Style Filter Button & Popover */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => {
                setIsFilterOpen((prev) => !prev);
                setIsSortOpen(false);
              }}
              className={`h-7 px-2.5 rounded-lg border text-[11px] font-medium flex items-center space-x-1.5 transition cursor-pointer ${
                activeFilterCount > 0
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-semibold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
              }`}
              title="Filter wire queue"
            >
              <SlidersHorizontal className="w-3 h-3 shrink-0" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-white text-blue-700 rounded-full w-4 h-4 text-[9px] font-bold flex items-center justify-center shrink-0">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Amazon-Style Filter Sheet Popover */}
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3.5 space-y-3.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                    Filter Queue
                  </span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Section 1: Wire Status */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </span>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100/80 p-0.5 rounded-xl text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActiveTab('all')}
                      className={`py-1 px-1.5 rounded-lg transition font-medium text-center cursor-pointer ${
                        activeTab === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Live ({liveAssets.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('triage')}
                      className={`py-1 px-1.5 rounded-lg transition font-medium text-center cursor-pointer ${
                        activeTab === 'triage'
                          ? 'bg-white text-amber-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Triage ({countAction})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('approved')}
                      className={`py-1 px-1.5 rounded-lg transition font-medium text-center cursor-pointer ${
                        activeTab === 'approved'
                          ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Approved ({countApproved})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('archive')}
                      className={`py-1 px-1.5 rounded-lg transition font-medium text-center cursor-pointer ${
                        activeTab === 'archive'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Archive ({archiveAssets.length})
                    </button>
                  </div>
                </div>

                {/* Section 2: News Desk (All-Pill Chips Grid, Zero Dropdown!) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      News Desk
                    </span>
                    {selectedBeat !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedBeat('all')}
                        className="text-[9.5px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                      >
                        Reset Desk
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedBeat('all')}
                      className={`px-2 py-1 rounded-lg text-[10.5px] transition cursor-pointer flex items-center space-x-1 border ${
                        selectedBeat === 'all'
                          ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 font-medium'
                      }`}
                    >
                      <span>All Desks</span>
                    </button>
                    {CATEGORY_LIST.map((c) => {
                      const isSelected = selectedBeat === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedBeat(isSelected ? 'all' : c.id)}
                          className={`px-2 py-1 rounded-lg text-[10.5px] transition cursor-pointer flex items-center space-x-1.5 border ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 border-blue-300 font-semibold shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 font-medium'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dotColor}`} />
                          <span className="truncate">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Story Attributes (Combined Urgency & Format in 1 row!) */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Attributes
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setUrgencyFilter((prev) => (prev === 'breaking' ? 'all' : 'breaking'))}
                      className={`flex-1 py-1 px-2 rounded-lg text-[10.5px] transition cursor-pointer flex items-center justify-center space-x-1 border ${
                        urgencyFilter === 'breaking'
                          ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 font-medium'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${urgencyFilter === 'breaking' ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span>Breaking Only</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormatFilter((prev) => (prev === 'video' ? 'all' : 'video'))}
                      className={`flex-1 py-1 px-2 rounded-lg text-[10.5px] transition cursor-pointer flex items-center justify-center space-x-1 border ${
                        formatFilter === 'video'
                          ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 font-medium'
                      }`}
                    >
                      <Video className="w-3 h-3" />
                      <span>Videos Only</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Chips Bar (Shown ONLY when filters are active) */}
        {activeFilterCount > 0 && (
          <div className="flex items-center flex-wrap gap-1 pt-0.5 select-none text-[10px]">
            {activeTab !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                <span>{activeTab === 'triage' ? 'Triage' : activeTab === 'approved' ? 'Approved' : 'Archive'}</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {selectedBeat !== 'all' && activeBeatMeta && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                <span className={`w-1.5 h-1.5 rounded-full ${activeBeatMeta.dotColor}`} />
                <span>{activeBeatMeta.label}</span>
                <button
                  type="button"
                  onClick={() => setSelectedBeat('all')}
                  className="hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {urgencyFilter === 'breaking' && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                <span>Breaking</span>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('all')}
                  className="hover:text-rose-900 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {formatFilter !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                <span>{formatFilter === 'video' ? 'Videos' : 'Photos'}</span>
                <button
                  type="button"
                  onClick={() => setFormatFilter('all')}
                  className="hover:text-blue-900 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-slate-400 hover:text-rose-600 text-[10px] ml-1 font-medium cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        {/* Upload in Progress Indicator */}
        {isUploading && (
          <div className="flex items-center space-x-2 px-2.5 py-1 bg-blue-50 border border-blue-200/80 rounded-lg text-blue-700 text-xs">
            <RefreshCw className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
            <span className="font-semibold text-[10px] truncate">Ingesting media to Cloudinary...</span>
          </div>
        )}
      </div>

      {/* Scrollable Stream of Cards */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0"
        style={{ scrollbarGutter: 'stable' }}
      >
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12 px-4">
            <AlertCircle className="w-6 h-6 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium text-slate-500">
              {activeTab === 'archive' ? 'No items in archive' : 'No items match current filters'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {activeFilterCount > 0
                ? 'Try resetting your filter or search criteria'
                : 'Drop media files here or submit via top bar'}
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const isSelected = selectedId === asset.public_id;
            const isChecked = selectedIds.includes(asset.public_id);
            const thumbUrl = asset.secure_url || asset.syndication_urls?.feed_1_1;
            const cat = getCategoryMeta(asset.incident_type);

            return (
              <div
                key={asset.public_id}
                onClick={(e) => {
                  if (selectedIds.length > 0) {
                    handleToggleItem(asset.public_id, e);
                  } else {
                    onSelect(asset);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    asset,
                  });
                }}
                className={`group min-h-[66px] shrink-0 p-2.5 rounded-xl border cursor-pointer transition-colors duration-100 flex items-center space-x-3 relative overflow-hidden select-none box-border ${
                  isChecked
                    ? 'bg-blue-50/90 border-blue-500 shadow-2xs ring-1 ring-blue-500/30'
                    : isSelected
                    ? 'bg-blue-50/50 border-blue-400 shadow-2xs ring-1 ring-blue-400/20'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300 shadow-2xs'
                } border-l-[3.5px] ${BEAT_BORDER_MAP[cat.id] || 'border-l-slate-400'}`}
              >
                {/* Media Thumbnail */}
                <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-slate-200/80 shadow-2xs flex items-center justify-center">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-400">
                      {asset.resource_type === 'video' ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                    </div>
                  )}

                  {/* Clean Selection Checkbox (visible on hover or when checked) */}
                  <div
                    onClick={(e) => handleToggleItem(asset.public_id, e)}
                    className={`absolute top-1 left-1 transition-opacity duration-150 cursor-pointer ${
                      isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title={isChecked ? 'Deselect asset' : 'Select asset'}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-blue-600 text-white shadow-xs ring-1.5 ring-white'
                          : 'bg-black/60 hover:bg-black/85 text-white backdrop-blur-[2px] ring-1 ring-white/70'
                      }`}
                    >
                      {isChecked ? (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      )}
                    </div>
                  </div>

                  {/* Video format badge on thumbnail */}
                  {asset.resource_type === 'video' && !isChecked && (
                    <div className="absolute bottom-0.5 right-0.5 bg-black/75 backdrop-blur-[2px] px-1 py-0.2 rounded text-[8px] text-white flex items-center space-x-0.5">
                      <Video className="w-2.5 h-2.5 text-blue-400" />
                    </div>
                  )}
                </div>

                {/* Clean, Non-Crammed Editorial Card Body */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  {/* Headline */}
                  <p
                    className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors pr-6"
                    title={asset.headline || asset.public_id}
                  >
                    {asset.headline || asset.public_id}
                  </p>

                  {/* Clean, Focused Metadata Row: 09:22 · [Dot] Beat · [Breaking] · [Triage Faces] */}
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-1 min-w-0 flex-wrap">
                    <span className="font-mono text-slate-400 shrink-0">
                      {new Date(asset.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>

                    <span className="text-slate-300 shrink-0">·</span>

                    <div
                      className="flex items-center space-x-1 truncate text-slate-600 font-medium shrink-0"
                      title={`Desk: ${cat.label}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.dotColor}`} />
                      <span className="truncate">{cat.label}</span>
                    </div>

                    {asset.urgency === 'breaking' && (
                      <>
                        <span className="text-slate-300 shrink-0">·</span>
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/70 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                          <span>Breaking</span>
                        </span>
                      </>
                    )}

                    {asset.review_status === 'action_required' && asset.faces && asset.faces.length > 0 && (
                      <>
                        <span className="text-slate-300 shrink-0">·</span>
                        <span
                          className="inline-flex items-center space-x-0.5 text-amber-600 font-medium text-[10px] shrink-0"
                          title={`${asset.faces.length} detected face(s) requiring review`}
                        >
                          <Users className="w-2.5 h-2.5 shrink-0" />
                          <span>{asset.faces.length} to review</span>
                        </span>
                      </>
                    )}

                    {asset.review_status === 'quarantined' && (
                      <>
                        <span className="text-slate-300 shrink-0">·</span>
                        <span
                          className="inline-flex items-center space-x-0.5 text-rose-600 font-semibold text-[10px] shrink-0"
                          title="Quarantined"
                        >
                          <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
                          <span>Quarantined</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Floating Top-Right Hover Quick Actions (Never squishes text) */}
                <div
                  className={`absolute top-2 right-2 flex items-center space-x-1 transition-opacity duration-150 z-20 ${
                    selectedIds.length > 0 ? 'invisible pointer-events-none' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {activeTab !== 'archive' ? (
                    onArchiveToggle && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveToggle(asset.public_id, true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer bg-white/95 shadow-2xs border border-slate-200/80"
                        title="Move to Cleared Archive"
                      >
                        <Archive className="w-3 h-3" />
                      </button>
                    )
                  ) : (
                    onArchiveToggle && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchiveToggle(asset.public_id, false);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer bg-white/95 shadow-2xs border border-slate-200/80"
                        title="Restore to Live Inbound Buffer"
                      >
                        <ArchiveRestore className="w-3 h-3" />
                      </button>
                    )
                  )}

                  {onDeleteSingle && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this asset from wire and Cloudinary?')) {
                          onDeleteSingle(asset.public_id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer bg-white/95 shadow-2xs border border-slate-200/80"
                      title="Delete asset permanently"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pinned Footer Status Bar */}
      <div className="shrink-0 px-3 py-2 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[10px] text-slate-600 font-medium">
            {filteredAssets.length} of {activeTab === 'archive' ? archiveAssets.length : liveAssets.length} stories
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">Live wire synced</span>
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <WireContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          asset={contextMenu.asset}
          onClose={() => setContextMenu(null)}
          onUpdateStatus={onUpdateStatus}
          onArchiveToggle={onArchiveToggle}
          onDeleteSingle={onDeleteSingle}
          onToggleSelect={(id) => handleToggleItem(id)}
          isSelected={selectedIds.includes(contextMenu.asset.public_id)}
        />
      )}
    </div>
  );
};
