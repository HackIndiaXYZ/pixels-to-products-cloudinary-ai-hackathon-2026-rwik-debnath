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
} from 'lucide-react';
import { getCategoryMeta } from '../../utils/categories';
import { WireContextMenu } from './WireContextMenu';

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
  // ONE Unified View Tab: 'all' (all live buffer), 'triage' (unapproved live), 'approved' (approved live), 'archive' (cleared archive)
  const [activeTab, setActiveTab] = useState<'all' | 'triage' | 'approved' | 'archive'>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; asset: MediaAsset } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const liveAssets = assets.filter((a) => !a.is_archived);
  const archiveAssets = assets.filter((a) => a.is_archived);
  const countAction = liveAssets.filter((a) => a.review_status === 'action_required').length;
  const countApproved = liveAssets.filter((a) => a.review_status === 'approved').length;

  // Filter based on active tab
  const baseAssets = activeTab === 'archive'
    ? archiveAssets
    : activeTab === 'triage'
    ? liveAssets.filter((a) => a.review_status === 'action_required')
    : activeTab === 'approved'
    ? liveAssets.filter((a) => a.review_status === 'approved')
    : liveAssets;

  // Filter based on search query across headline, ID, incident category, and hardware model
  const filteredAssets = baseAssets.filter((asset) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (asset.headline && asset.headline.toLowerCase().includes(q)) ||
      asset.public_id.toLowerCase().includes(q) ||
      (asset.incident_type && asset.incident_type.toLowerCase().includes(q)) ||
      (asset.telemetry?.model && asset.telemetry.model.toLowerCase().includes(q))
    );
  });

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

      {/* Clean Minimalist Header & Unified Controls */}
      <div className="p-3 border-b border-slate-100 space-y-2.5 shrink-0">
        {/* Tier 1: Fixed-Height Header with Master Checkbox & Contextual Actions (Linear / Bloomberg Standard) */}
        <div className="h-8 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            {/* Master Select All Checkbox */}
            <button
              onClick={handleToggleSelectAll}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isAllSelected
                  ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                  : selectedIds.length > 0
                  ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-2xs'
                  : 'border-slate-300 hover:border-slate-400 bg-white text-transparent'
              }`}
              title={
                isAllSelected
                  ? 'Deselect all (Esc)'
                  : `Select all ${filteredAssets.length} items`
              }
            >
              {isAllSelected ? (
                <Check className="w-2.5 h-2.5 stroke-[3.5]" />
              ) : selectedIds.length > 0 ? (
                <div className="w-2 h-[2px] bg-blue-600 rounded-full" />
              ) : (
                <div className="w-2 h-2" />
              )}
            </button>

            {selectedIds.length > 0 ? (
              <span className="text-xs font-semibold text-slate-800 truncate">
                {selectedIds.length} selected
              </span>
            ) : (
              <>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {activeTab === 'archive' ? 'Wire Archive' : 'Live Wire'}
                </span>
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                  {activeTab === 'archive' ? archiveAssets.length : liveAssets.length}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {selectedIds.length > 0 ? (
              <>
                {activeTab !== 'archive' ? (
                  onBatchArchive && (
                    <button
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
              </>
            ) : (
              onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer active:scale-90"
                  title="Refresh Wire Feed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              )
            )}
          </div>
        </div>

        {/* Tier 2: Full-width Wire Search Input */}
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
              onClick={() => setSearch('')}
              className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Tier 3: The ONE Unified Segmented Tab Bar */}
        <div className="flex items-center space-x-1 bg-slate-100/90 p-0.5 rounded-lg text-[10px] font-semibold select-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1 rounded-md transition cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Live</span>
            <span className="font-mono text-[9px] text-slate-400">({liveAssets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('triage')}
            className={`flex-1 py-1 rounded-md transition cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'triage'
                ? 'bg-white text-amber-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Triage</span>
            <span className="font-mono text-[9px] text-amber-600/80">({countAction})</span>
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`flex-1 py-1 rounded-md transition cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'approved'
                ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Approved</span>
            <span className="font-mono text-[9px] text-emerald-600/80">({countApproved})</span>
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`flex-1 py-1 rounded-md transition cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === 'archive'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Archive</span>
            <span className="font-mono text-[9px] text-slate-400">({archiveAssets.length})</span>
          </button>
        </div>

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
              {activeTab === 'archive' ? 'No items in archive' : 'No items in this view'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {search
                ? 'Try resetting your search query'
                : 'Drop media files here or submit via top bar'}
            </p>
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
                className={`group h-[68px] shrink-0 p-2 rounded-xl border cursor-pointer transition-colors duration-100 flex items-center space-x-2.5 relative overflow-hidden select-none box-border ${
                  isChecked
                    ? 'bg-blue-50/90 border-blue-500 shadow-2xs ring-1 ring-blue-500/30'
                    : isSelected
                    ? 'bg-blue-50/60 border-blue-400 shadow-2xs ring-1 ring-blue-400/20'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300 shadow-2xs'
                } ${
                  asset.review_status === 'approved'
                    ? 'border-l-[3.5px] border-l-emerald-500'
                    : asset.review_status === 'quarantined'
                    ? 'border-l-[3.5px] border-l-rose-500'
                    : 'border-l-[3.5px] border-l-amber-500'
                }`}
              >
                {/* Media Thumbnail with Integrated Hover/Checked Checkbox */}
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

                  {/* Clean Hover Checkbox (Only visible on hover OR when checked — Never defaces unselected photos) */}
                  <div
                    onClick={(e) => handleToggleItem(asset.public_id, e)}
                    className={`absolute top-1 left-1 transition-opacity duration-150 cursor-pointer ${
                      isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title={isChecked ? 'Deselect asset' : 'Select asset for batch action'}
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

                  {asset.resource_type === 'video' && !isChecked && (
                    <div className="absolute bottom-0.5 right-0.5 bg-black/75 backdrop-blur-[2px] p-0.5 rounded text-[8px] text-white">
                      <Film className="w-2.5 h-2.5 text-blue-400" />
                    </div>
                  )}
                </div>

                {/* Minimalist 2-Tier Hierarchy */}
                <div className="flex-1 min-w-0 h-full flex flex-col justify-between py-0.5">
                  {/* Tier 1: Bold Editorial Headline (Strict 2-line clamp) */}
                  <p
                    className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors"
                    title={asset.headline || asset.public_id}
                  >
                    {asset.headline || asset.public_id}
                  </p>

                  {/* Tier 2: Time + Status Dot + Subtle Beat Label + Hover Actions */}
                  <div className="h-4 flex items-center justify-between w-full min-w-0 shrink-0">
                    <div className="flex items-center space-x-1.5 text-[10px] min-w-0 text-slate-400">
                      <span className="font-mono">
                        {new Date(asset.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <span className="text-slate-300">·</span>

                      <div
                        className="flex items-center space-x-1 truncate"
                        title={`Beat: ${cat.label} | Status: ${asset.review_status}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.dotColor}`} />
                        <span className="truncate max-w-[110px] text-slate-500 font-medium">
                          {cat.label}
                        </span>
                      </div>
                    </div>

                    {/* Quick Actions (Archive & Delete) - Hidden when selected to prevent layout shift */}
                    <div
                      className={`flex items-center space-x-0.5 transition shrink-0 h-4 ${
                        selectedIds.length > 0 ? 'invisible pointer-events-none' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {activeTab !== 'archive' ? (
                        onArchiveToggle && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchiveToggle(asset.public_id, true);
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Move to Cleared Archive"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                        )
                      ) : (
                        onArchiveToggle && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchiveToggle(asset.public_id, false);
                            }}
                            className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                            title="Restore to Live Inbound Buffer"
                          >
                            <ArchiveRestore className="w-3 h-3" />
                          </button>
                        )
                      )}

                      {onDeleteSingle && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this asset from wire and Cloudinary?')) {
                              onDeleteSingle(asset.public_id);
                            }
                          }}
                          className="p-0.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Delete asset permanently"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
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
