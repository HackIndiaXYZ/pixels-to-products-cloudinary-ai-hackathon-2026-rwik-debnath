import React, { useState, useRef, useEffect } from 'react';
import type { MediaAsset, StoryPackage } from '../../types';
import {
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
  Layers,
  Minus,
  ShieldAlert,
  Lock,
  Plus,
  FolderInput,
  Radio,
} from 'lucide-react';
import { CATEGORY_LIST, getCategoryMeta } from '../../utils/categories';
import { WireContextMenu } from './WireContextMenu';
import { NewPackageModal } from './NewPackageModal';
import { BatchMoveModal, type PackageOption } from './BatchMoveModal';

type SortOption = 'newest' | 'oldest' | 'urgency' | 'faces';

const SORT_OPTIONS: { id: SortOption; label: string; shortLabel: string }[] = [
  { id: 'newest', label: 'Newest Ingest', shortLabel: 'Newest' },
  { id: 'oldest', label: 'Oldest Ingest', shortLabel: 'Oldest' },
  { id: 'urgency', label: 'Urgency (Breaking)', shortLabel: 'Urgent' },
  { id: 'faces', label: 'Triage Priority (Faces)', shortLabel: 'Faces' },
];

interface WireQueueProps {
  assets: MediaAsset[];
  packages?: StoryPackage[];
  selectedId: string | null;
  selectedPackageId?: string | null;
  onSelect: (asset: MediaAsset) => void;
  onSelectPackage?: (packageId: string) => void;
  onDeleteSingle?: (public_id: string) => void;
  onDeleteBatch?: (public_ids: string[]) => void;
  onArchiveToggle?: (public_id: string, is_archived: boolean) => void;
  onBatchArchive?: (public_ids: string[], is_archived: boolean) => void;
  onSweepApproved?: () => void;
  onDirectUpload?: (files: FileList | File[], targetPackage?: { event_id: string; event_title?: string }) => Promise<void>;
  isUploading?: boolean;
  onUpdateStatus?: (public_id: string, status: 'approved' | 'action_required') => void;
  onAssignPackage?: (public_id: string, event_id: string | null, event_title?: string | null) => Promise<void>;
  onBatchAssignPackage?: (public_ids: string[], event_id: string | null, event_title?: string | null) => Promise<void>;
  onRefreshQueue?: () => void;
}

export const WireQueue: React.FC<WireQueueProps> = ({
  assets,
  packages = [],
  selectedId,
  selectedPackageId,
  onSelect,
  onSelectPackage,
  onDeleteSingle,
  onDeleteBatch,
  onArchiveToggle,
  onBatchArchive,
  onDirectUpload,
  isUploading = false,
  onUpdateStatus,
  onAssignPackage,
  onBatchAssignPackage,
  onRefreshQueue,
}) => {
  // Amazon-style unified filter states
  const [activeTab, setActiveTab] = useState<'all' | 'triage' | 'approved' | 'quarantined' | 'archive'>('all');
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [selectedBeat, setSelectedBeat] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'breaking'>('all');
  const [viewMode, setViewMode] = useState<'stream' | 'packages'>('stream');

  // Collapsed packages tracking
  const [collapsedPackageIds, setCollapsedPackageIds] = useState<Set<string>>(new Set());

  const handleToggleCollapse = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedPackageIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  // Drag-and-drop between packages state
  const [dragOverPackageId, setDragOverPackageId] = useState<string | null>(null);
  const [isDragOverStandalone, setIsDragOverStandalone] = useState<boolean>(false);
  const [isDraggingCard, setIsDraggingCard] = useState<boolean>(false);
  const [draggedCount, setDraggedCount] = useState<number>(0);
  const [isNewPackageModalOpen, setIsNewPackageModalOpen] = useState<boolean>(false);

  // Popover menus
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
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
  const countQuarantined = liveAssets.filter((a) => a.review_status === 'quarantined').length;

  // Active filter count
  const activeFilterCount =
    (activeTab !== 'all' ? 1 : 0) +
    (selectedBeat !== 'all' ? 1 : 0) +
    (urgencyFilter !== 'all' ? 1 : 0);

  const handleResetFilters = () => {
    setActiveTab('all');
    setSelectedBeat('all');
    setUrgencyFilter('all');
  };

  // 1. Filter by lifecycle status
  const baseAssets = activeTab === 'archive'
    ? archiveAssets
    : activeTab === 'triage'
    ? liveAssets.filter((a) => a.review_status === 'action_required')
    : activeTab === 'approved'
    ? liveAssets.filter((a) => a.review_status === 'approved')
    : activeTab === 'quarantined'
    ? liveAssets.filter((a) => a.review_status === 'quarantined')
    : liveAssets;

  // 2. Filter by search, news desk, urgency
  const filteredAssets = baseAssets.filter((asset) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        (asset.headline && asset.headline.toLowerCase().includes(q)) ||
        (asset.event_title && asset.event_title.toLowerCase().includes(q)) ||
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

    return true;
  });

  // Count takes/angles per event cluster across live queue
  const eventCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach((a) => {
      if (a.event_id) {
        counts[a.event_id] = (counts[a.event_id] || 0) + 1;
      }
    });
    return counts;
  }, [assets]);

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

  // Group assets into Clustered Event Packages vs Standalone Stories
  const { eventPackages, standaloneStories } = React.useMemo(() => {
    const packagesMap: {
      [key: string]: {
        event_id: string;
        event_title: string;
        incident_type: string;
        cluster_radius_km: number;
        package_status: 'active' | 'concluded' | 'locked';
        assets: MediaAsset[];
      };
    } = {};

    // 1. Pre-populate from packages prop
    if (packages && packages.length > 0) {
      packages.forEach((pkg) => {
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matches =
            pkg.event_title.toLowerCase().includes(q) ||
            pkg.event_id.toLowerCase().includes(q) ||
            pkg.incident_type.toLowerCase().includes(q);
          if (!matches) return;
        }
        if (selectedBeat !== 'all') {
          const cat = getCategoryMeta(pkg.incident_type);
          if (pkg.incident_type !== selectedBeat && cat.id !== selectedBeat) {
            return;
          }
        }
        packagesMap[pkg.event_id] = {
          event_id: pkg.event_id,
          event_title: pkg.event_title,
          incident_type: pkg.incident_type,
          cluster_radius_km: pkg.cluster_radius_km ?? 1.5,
          package_status: pkg.package_status || 'active',
          assets: [],
        };
      });
    }

    const standalone: MediaAsset[] = [];

    // 2. Distribute filteredAssets
    filteredAssets.forEach((a) => {
      if (a.event_id) {
        if (!packagesMap[a.event_id]) {
          packagesMap[a.event_id] = {
            event_id: a.event_id,
            event_title: a.event_title || a.headline || 'Breaking Incident',
            incident_type: a.incident_type,
            cluster_radius_km: a.cluster_radius_km ?? 1.5,
            package_status: a.package_status || 'active',
            assets: [],
          };
        }
        packagesMap[a.event_id].assets.push(a);
        if (a.package_status === 'concluded' || a.package_status === 'locked') {
          packagesMap[a.event_id].package_status = a.package_status;
        }
      } else {
        standalone.push(a);
      }
    });

    return {
      eventPackages: Object.values(packagesMap),
      standaloneStories: standalone,
    };
  }, [filteredAssets, packages, search, selectedBeat]);

  // Unique active packages for batch move destinations
  const availablePackages = React.useMemo(() => {
    const map = new Map<string, PackageOption>();
    if (packages && packages.length > 0) {
      packages.forEach((pkg) => {
        map.set(pkg.event_id, {
          event_id: pkg.event_id,
          title: pkg.event_title,
          count: 0,
          incident_type: pkg.incident_type,
          package_status: pkg.package_status || 'active',
        });
      });
    }
    assets.forEach((a) => {
      if (a.event_id && !a.is_archived) {
        const existing = map.get(a.event_id);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(a.event_id, {
            event_id: a.event_id,
            title: a.event_title || a.headline || `Package #${a.event_id.replace(/^evt_/, '')}`,
            count: 1,
            incident_type: a.incident_type,
            package_status: a.package_status || 'active',
          });
        }
      }
    });
    return Array.from(map.values());
  }, [assets, packages]);

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
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Escape' && selectedIds.length > 0) {
        setSelectedIds([]);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'j' || e.key === 'k') {
        if (!filteredAssets.length) return;
        e.preventDefault();
        const currentIndex = filteredAssets.findIndex((a) => a.public_id === selectedId);
        if (e.key === 'ArrowDown' || e.key === 'j') {
          const nextIndex = currentIndex < filteredAssets.length - 1 ? currentIndex + 1 : 0;
          onSelect(filteredAssets[nextIndex]);
        } else {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredAssets.length - 1;
          onSelect(filteredAssets[prevIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds.length, filteredAssets, selectedId, onSelect]);

  // Window-level safety cleanup to guarantee drag overlay never gets stuck on screen
  useEffect(() => {
    const handleWindowDragEndOrDrop = () => {
      setIsDraggingOver(false);
      setDragOverPackageId(null);
      setIsDragOverStandalone(false);
    };
    window.addEventListener('dragend', handleWindowDragEndOrDrop);
    window.addEventListener('drop', handleWindowDragEndOrDrop);
    return () => {
      window.removeEventListener('dragend', handleWindowDragEndOrDrop);
      window.removeEventListener('drop', handleWindowDragEndOrDrop);
    };
  }, []);

  const isExternalFilesDrag = (e: React.DragEvent) => {
    if (isDraggingCard) return false;
    if (!e.dataTransfer) return false;
    const types = Array.from(e.dataTransfer.types || []);
    if (types.includes('application/x-presswire-asset')) return false;
    return types.includes('Files');
  };

  const handleDrop = async (e: React.DragEvent) => {
    setIsDraggingOver(false);
    if (!isExternalFilesDrag(e)) {
      return;
    }
    e.preventDefault();
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

  const renderAssetCard = (asset: MediaAsset, isNestedInPackage = false, _angleIndex?: number) => {
    const isSelected = selectedId === asset.public_id;
    const isChecked = selectedIds.includes(asset.public_id);
    const thumbUrl = asset.syndication_urls?.feed_1_1 || asset.secure_url;
    const cat = getCategoryMeta(asset.incident_type);
    const siblingCount = asset.event_id ? (eventCounts[asset.event_id] || 0) : 0;

    return (
      <div
        key={asset.public_id}
        draggable={true}
        onDragStart={(e) => {
          const isPartOfSelection = selectedIds.includes(asset.public_id);
          const draggedIds = isPartOfSelection && selectedIds.length > 1
            ? selectedIds
            : [asset.public_id];

          e.dataTransfer.setData('application/x-presswire-asset', asset.public_id);
          e.dataTransfer.setData('application/x-presswire-batch', JSON.stringify(draggedIds));
          e.dataTransfer.setData('text/plain', draggedIds.join(','));
          e.dataTransfer.effectAllowed = 'move';
          setIsDraggingCard(true);
          setDraggedCount(draggedIds.length);
        }}
        onDragEnd={() => {
          setIsDraggingCard(false);
          setDraggedCount(0);
          setDragOverPackageId(null);
          setIsDragOverStandalone(false);
        }}
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
        className={`group min-h-[64px] shrink-0 p-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-100 flex items-center space-x-3 relative overflow-hidden select-none box-border ${
          isChecked
            ? 'bg-blue-50/90 border-blue-500 shadow-2xs ring-1 ring-blue-500/30'
            : isSelected
            ? 'bg-blue-50/50 border-blue-400 shadow-2xs ring-1 ring-blue-400/20'
            : isNestedInPackage
            ? 'bg-white border-slate-200/70 hover:bg-slate-50/80 hover:border-slate-300 shadow-2xs'
            : 'bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300 shadow-2xs'
        }`}
      >
        {/* Media Thumbnail */}
        <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-slate-200/80 shadow-2xs flex items-center justify-center">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement?.querySelector('.thumb-fallback');
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`thumb-fallback w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-400 ${
              thumbUrl ? 'hidden' : ''
            }`}
          >
            <ImageIcon className="w-4 h-4" />
          </div>

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
        </div>

        {/* Minimalist Editorial Card Body */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          {/* Clean Editorial Headline */}
          <div className="flex items-center space-x-1.5 pr-2">
            <p
              className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors"
              title={asset.headline || asset.public_id}
            >
              {(asset.headline || asset.public_id).replace(/^(breaking|urgent|alert)[\s:–—-]+/i, '')}
            </p>
          </div>

          {/* Clean, Focused Metadata Row */}
          <div className="flex items-center space-x-1.5 min-w-0 text-[11px] mt-1.5 h-5">
            <span className={`font-semibold shrink-0 text-[11px] leading-none ${cat.textColor || 'text-slate-600'}`}>
              {cat.shortLabel || cat.label}
            </span>
            <span className="text-slate-300 font-normal text-[11px] leading-none select-none">·</span>
            <span className="text-slate-500 font-medium shrink-0 text-[11px] leading-none">
              {new Date(asset.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>

            {/* In stream mode: Multi-angle sibling indicator if > 1 angle exists */}
            {!isNestedInPackage && siblingCount > 1 && (
              <>
                <span className="text-slate-300 font-normal text-[11px] leading-none select-none">·</span>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 shrink-0 leading-none"
                  title={`Grouped with ${siblingCount} angles under ${asset.event_title || 'event package'}`}
                >
                  <Layers className="w-2.5 h-2.5 text-slate-400 shrink-0 stroke-[2.2]" />
                  <span>{siblingCount}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right-Hand Indicator Column: Breaking Urgency (Top) & Review Status (Bottom) */}
        <div className="self-stretch flex flex-col justify-between items-center py-1 w-3.5 shrink-0 select-none">
          {/* Top: Breaking Urgency */}
          <div className="h-4 flex items-center justify-center">
            {asset.urgency === 'breaking' && (
              <span
                className="flex items-center justify-center group-hover:opacity-0 transition-opacity"
                title="Breaking Wire Event"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                </span>
              </span>
            )}
          </div>

          {/* Bottom: Triage / Quarantine Status */}
          <div className="h-4 flex items-center justify-center">
            {asset.review_status === 'quarantined' ? (
              <span
                className="flex items-center justify-center text-rose-600"
                title="Quarantined: Flagged by Content Safety"
              >
                <ShieldAlert className="w-2.5 h-2.5 stroke-[2.2]" />
              </span>
            ) : asset.review_status === 'action_required' ? (
              <span
                className="flex items-center justify-center text-amber-500"
                title="Needs Triage: Privacy Redaction or Editorial Review Required"
              >
                <AlertCircle className="w-2.5 h-2.5 stroke-[2.2]" />
              </span>
            ) : null}
          </div>
        </div>

        {/* Floating Top-Right Hover Quick Actions */}
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
  };

  const renderEmptyState = () => (
    <div className="text-center py-16 px-4 flex flex-col items-center select-none">
      {activeTab === 'archive' ? (
        <>
          <Archive className="w-5 h-5 text-slate-300 mb-2 stroke-[1.5]" />
          <p className="text-xs font-semibold text-slate-600">Archive is empty</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Archived wire stories and packages will appear here
          </p>
        </>
      ) : activeFilterCount > 0 ? (
        <>
          <AlertCircle className="w-5 h-5 text-slate-300 mb-2 stroke-[1.5]" />
          <p className="text-xs font-semibold text-slate-600">No matching stories</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Try adjusting or resetting your filter criteria
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Reset Filters
          </button>
        </>
      ) : (
        <>
          <div className="w-7 h-7 rounded-full bg-slate-100/90 flex items-center justify-center text-slate-400 mb-2">
            <Radio className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xs font-semibold text-slate-500">Wire Buffer Empty</p>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-[190px]">
            Standby for field dispatches or public tip line submissions
          </p>
        </>
      )}
    </div>
  );

  return (
    <div
      onDragOver={(e) => {
        if (!isExternalFilesDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDraggingOver(true);
      }}
      onDragEnter={(e) => {
        if (!isExternalFilesDrag(e)) return;
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={handleDrop}
      className={`bg-white border rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col h-full min-h-0 overflow-hidden relative ${
        isDraggingOver ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xl' : 'border-slate-200/80'
      }`}
    >
      {/* Hidden file picker input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Floating Drag & Drop Ingestion Overlay (Only for OS file drops) */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-blue-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-150 pointer-events-none select-none">
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
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {selectedIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                  title="Clear selection (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
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
                {/* Batch Move to Button -> Triggers VS Code Quick Pick Modal */}
                {onBatchAssignPackage && (
                  <button
                    type="button"
                    onClick={() => setIsMoveModalOpen(true)}
                    className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer flex items-center space-x-1"
                    title="Move selected items to a package or standalone"
                  >
                    <FolderInput className="w-3 h-3 text-slate-500" />
                    <span>Move to</span>
                  </button>
                )}

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
              </>
            ) : (
              <div className="flex items-center space-x-1.5">
                <div className="flex items-center p-0.5 bg-slate-100/90 rounded-lg text-[10px] font-semibold border border-slate-200/60 h-6">
                  <button
                    type="button"
                    onClick={() => setViewMode('stream')}
                    className={`px-2 h-full rounded transition cursor-pointer ${
                      viewMode === 'stream'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Flat chronological stream"
                  >
                    Stream
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('packages')}
                    className={`px-2 h-full rounded transition cursor-pointer ${
                      viewMode === 'packages'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Group by Breaking Story Packages"
                  >
                    Packages
                  </button>
                </div>
              </div>
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
            placeholder="Search wire stories..."
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
          {/* Left: Select All Checkbox & Sort Dropdown */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className={`w-4 h-4 rounded-[3px] border flex items-center justify-center transition cursor-pointer shrink-0 relative before:absolute before:-inset-1.5 ${
                isAllSelected
                  ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                  : selectedIds.length > 0
                  ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-50 border-slate-300 hover:border-slate-400 shadow-2xs'
              }`}
              title={isAllSelected ? 'Deselect all (Esc)' : 'Select all wire items'}
            >
              {isAllSelected ? (
                <Check className="w-3 h-3 stroke-[3]" />
              ) : selectedIds.length > 0 ? (
                <Minus className="w-3 h-3 stroke-[3]" />
              ) : null}
            </button>

            <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => {
                setIsSortOpen((prev) => !prev);
                setIsFilterOpen(false);
              }}
              className={`h-7 px-2 text-[11px] font-medium flex items-center space-x-1.5 transition cursor-pointer rounded-md ${
                sortOption !== 'newest'
                  ? 'text-blue-600 font-semibold hover:text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
              title="Sort stories"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
        </div>

          {/* Right: Amazon-Style Filter Button & Popover */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => {
                setIsFilterOpen((prev) => !prev);
                setIsSortOpen(false);
              }}
              className={`h-7 px-2 text-[11px] font-medium flex items-center space-x-1.5 transition cursor-pointer rounded-md ${
                activeFilterCount > 0
                  ? 'text-blue-600 font-semibold hover:text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
              title="Filter wire queue"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white rounded-full w-4 h-4 text-[9px] font-bold flex items-center justify-center shrink-0">
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

                {/* Section 1: Wire Status (Clean Vertical List with Right-Aligned Counts) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </span>
                    {activeTab !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className="text-[9.5px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                      >
                        Reset Status
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-1 space-y-0.5 text-xs">
                    {/* All Live */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('all')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer text-left ${
                        activeTab === 'all'
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'hover:bg-slate-100/90 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                        <span>All Live</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-normal">
                        {liveAssets.length}
                      </span>
                    </button>

                    {/* Needs Triage */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('triage')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer text-left ${
                        activeTab === 'triage'
                          ? 'bg-amber-50 text-amber-900 font-semibold'
                          : 'hover:bg-slate-100/90 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Needs Triage</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-normal">
                        {countAction}
                      </span>
                    </button>

                    {/* Approved */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('approved')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer text-left ${
                        activeTab === 'approved'
                          ? 'bg-emerald-50 text-emerald-900 font-semibold'
                          : 'hover:bg-slate-100/90 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Approved</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-normal">
                        {countApproved}
                      </span>
                    </button>

                    {/* Quarantined */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('quarantined')}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer text-left ${
                        activeTab === 'quarantined'
                          ? 'bg-rose-50 text-rose-900 font-semibold'
                          : 'hover:bg-slate-100/90 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Quarantined</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-normal">
                        {countQuarantined}
                      </span>
                    </button>

                    {/* Archive */}
                    <div className="pt-0.5 border-t border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => setActiveTab('archive')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer text-left ${
                          activeTab === 'archive'
                            ? 'bg-slate-200/80 text-slate-900 font-semibold'
                            : 'hover:bg-slate-100/90 text-slate-600 font-medium'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>Archive</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 font-normal">
                          {archiveAssets.length}
                        </span>
                      </button>
                    </div>
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
                          ? 'bg-blue-50 text-blue-900 border-blue-300 font-semibold shadow-2xs'
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
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setUrgencyFilter((prev) => (prev === 'breaking' ? 'all' : 'breaking'))}
                      className={`w-full py-1 px-2 rounded-lg text-[10.5px] transition cursor-pointer flex items-center justify-center space-x-1 border ${
                        urgencyFilter === 'breaking'
                          ? 'bg-white text-rose-600 border-slate-300 font-bold shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 font-medium'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${urgencyFilter === 'breaking' ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span>Breaking Only</span>
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
                <span>{activeTab === 'triage' ? 'Triage' : activeTab === 'approved' ? 'Approved' : activeTab === 'quarantined' ? 'Quarantined' : 'Archive'}</span>
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
        className="flex-1 overflow-y-auto modern-scrollbar p-2 space-y-2 min-h-0"
        style={{ scrollbarGutter: 'stable' }}
      >
        {viewMode === 'packages' ? (
          eventPackages.length === 0 && standaloneStories.length === 0 ? (
            <div className="space-y-3">
              {/* Packages Bar with [+ New] */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Story Packages
                </span>
                <button
                  type="button"
                  onClick={() => setIsNewPackageModalOpen(true)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer flex items-center space-x-1"
                  title="Create a new named package dossier"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New</span>
                </button>
              </div>
              {renderEmptyState()}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Packages Bar with [+ New] */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Story Packages
                </span>
                <button
                  type="button"
                  onClick={() => setIsNewPackageModalOpen(true)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer flex items-center space-x-1"
                  title="Create a new named package dossier"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New</span>
                </button>
              </div>

              {/* 1. Clustered Multi-Angle Event Dossiers */}
              {eventPackages.map((pkg) => {
                const cat = getCategoryMeta(pkg.incident_type);
                const isAnySelected = pkg.assets.some((a) => a.public_id === selectedId);
              const isDragOverThis = dragOverPackageId === pkg.event_id;
              const isCollapsed = collapsedPackageIds.has(pkg.event_id);
              const isPkgSelected = selectedPackageId === pkg.event_id;
              const isLocked = pkg.package_status === 'concluded' || pkg.package_status === 'locked';

              return (
                <div
                  key={pkg.event_id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (isExternalFilesDrag(e)) {
                      e.dataTransfer.dropEffect = 'copy';
                    } else {
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                    }
                    if (dragOverPackageId !== pkg.event_id) setDragOverPackageId(pkg.event_id);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverPackageId(null);
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverPackageId(null);
                    setIsDraggingCard(false);
                    setDraggedCount(0);
                    setIsDraggingOver(false);

                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      if (onDirectUpload) {
                        await onDirectUpload(e.dataTransfer.files, { event_id: pkg.event_id, event_title: pkg.event_title });
                      }
                      return;
                    }

                    const batchRaw = e.dataTransfer.getData('application/x-presswire-batch');
                    let pids: string[] = [];
                    if (batchRaw) {
                      try {
                        pids = JSON.parse(batchRaw);
                      } catch {
                        pids = [];
                      }
                    }
                    if (!pids.length) {
                      const single = e.dataTransfer.getData('application/x-presswire-asset');
                      if (single) pids = [single];
                    }

                    if (pids.length > 1 && onBatchAssignPackage) {
                      await onBatchAssignPackage(pids, pkg.event_id, pkg.event_title);
                      setSelectedIds([]);
                    } else if (pids.length === 1) {
                      if (onAssignPackage) {
                        await onAssignPackage(pids[0], pkg.event_id, pkg.event_title);
                      } else if (onBatchAssignPackage) {
                        await onBatchAssignPackage(pids, pkg.event_id, pkg.event_title);
                      }
                      setSelectedIds([]);
                    }
                  }}
                  className={`rounded-2xl border transition-all duration-150 relative ${
                    isDragOverThis
                      ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500 shadow-md'
                      : isDraggingCard
                      ? 'border-dashed border-blue-400 bg-blue-50/20'
                      : isPkgSelected
                      ? 'bg-blue-50/30 border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                      : isAnySelected
                      ? 'bg-blue-50/20 border-blue-300 ring-1 ring-blue-300/30'
                      : 'bg-slate-50/40 border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {/* Incident Dossier Header */}
                  <div
                    onClick={() => onSelectPackage && onSelectPackage(pkg.event_id)}
                    className={`px-3 py-2 bg-slate-100/70 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition select-none group ${
                      isCollapsed ? 'rounded-2xl' : 'border-b border-slate-200/60 rounded-t-2xl'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleCollapse(pkg.event_id, e)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition cursor-pointer shrink-0"
                        title={isCollapsed ? 'Expand takes' : 'Collapse takes'}
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-150 ${
                            isCollapsed ? '-rotate-90 text-slate-600' : 'text-slate-400'
                          }`}
                        />
                      </button>
                      <span className={`w-2 h-2 rounded-full shrink-0 translate-y-[1px] ${cat.dotColor}`} />
                      <span
                        className={`text-xs font-bold truncate transition-colors ${
                          isPkgSelected ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-600'
                        }`}
                        title={pkg.event_title}
                      >
                        {pkg.event_title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 ml-2">
                      {/* Status indicator: Lock icon if locked/concluded, no icon if active */}
                      {isLocked && (
                        <span
                          className="flex items-center justify-center text-slate-400"
                          title="Concluded / Locked package"
                        >
                          <Lock className="w-3 h-3 text-slate-400 stroke-[2.2]" />
                        </span>
                      )}

                      <div className="flex items-center space-x-1 text-slate-500 text-xs font-semibold">
                        <Layers className="w-3 h-3 text-slate-400 stroke-[2.2]" />
                        <span>{pkg.assets.length}</span>
                        {isDragOverThis && draggedCount > 1 && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1 rounded animate-pulse">
                            +{draggedCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Child Takes (Collapsible) */}
                  {!isCollapsed && (
                    <div className="p-1.5 space-y-1.5">
                      {pkg.assets.length === 0 ? (
                        <div className="py-3 px-2 text-center border border-dashed border-slate-200/90 rounded-xl text-[11px] text-slate-400 font-medium bg-white/50">
                          {isDraggingCard ? 'Drop card here to add to package' : 'Empty package · Drop stories here'}
                        </div>
                      ) : (
                        pkg.assets.map((asset, idx) => renderAssetCard(asset, true, idx))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. Standalone Independent Wire Stories (Drop target to detach) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (isExternalFilesDrag(e)) {
                  e.dataTransfer.dropEffect = 'copy';
                } else {
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                }
                setIsDragOverStandalone(true);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsDragOverStandalone(false);
                }
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOverStandalone(false);
                setIsDraggingCard(false);
                setDraggedCount(0);
                setIsDraggingOver(false);

                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  if (onDirectUpload) {
                    await onDirectUpload(e.dataTransfer.files);
                  }
                  return;
                }

                const batchRaw = e.dataTransfer.getData('application/x-presswire-batch');
                let pids: string[] = [];
                if (batchRaw) {
                  try {
                    pids = JSON.parse(batchRaw);
                  } catch {
                    pids = [];
                  }
                }
                if (!pids.length) {
                  const single = e.dataTransfer.getData('application/x-presswire-asset');
                  if (single) pids = [single];
                }

                if (pids.length > 1 && onBatchAssignPackage) {
                  await onBatchAssignPackage(pids, null, null);
                  setSelectedIds([]);
                } else if (pids.length === 1) {
                  if (onAssignPackage) {
                    await onAssignPackage(pids[0], null, null);
                  } else if (onBatchAssignPackage) {
                    await onBatchAssignPackage(pids, null, null);
                  }
                  setSelectedIds([]);
                }
              }}
              className={`space-y-2 pt-1 rounded-2xl transition-all ${
                isDragOverStandalone
                  ? 'bg-blue-50/90 ring-2 ring-blue-500 p-2 border border-blue-400 shadow-md'
                  : isDraggingCard
                  ? 'border-2 border-dashed border-blue-300 bg-blue-50/20 p-2'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-200/60">
                <div className="flex items-center space-x-1.5 text-slate-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Standalone Stories
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">({standaloneStories.length})</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {isDraggingCard
                    ? draggedCount > 1
                      ? `Drop ${draggedCount} stories to detach`
                      : 'Drop here to detach'
                    : 'Independent Wire'}
                </span>
              </div>

              {standaloneStories.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-400 font-medium">
                  {isDraggingCard
                    ? draggedCount > 1
                      ? `Drop ${draggedCount} stories here to make Standalone`
                      : 'Drop card here to make Standalone'
                    : 'No standalone stories'}
                </div>
              ) : (
                standaloneStories.map((asset) => renderAssetCard(asset, false))
              )}
            </div>
          </div>
        )) : filteredAssets.length === 0 ? (
          renderEmptyState()
        ) : (
          filteredAssets.map((asset) => renderAssetCard(asset, false))
        )}
      </div>

      {/* Pinned Footer Status Bar */}
      <div className="shrink-0 px-3 py-2 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
        <span className="text-[10px] text-slate-600 font-medium">
          {viewMode === 'packages'
            ? `${eventPackages.length} packages · ${standaloneStories.length} standalone · ${filteredAssets.length} total`
            : `${filteredAssets.length} of ${activeTab === 'archive' ? archiveAssets.length : liveAssets.length} stories`}
        </span>
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

      {/* New Package Modal */}
      {isNewPackageModalOpen && (
        <NewPackageModal
          isOpen={isNewPackageModalOpen}
          existingPackages={availablePackages}
          onClose={() => setIsNewPackageModalOpen(false)}
          onSuccess={(newPkg) => {
            setViewMode('packages');
            if (onSelectPackage) onSelectPackage(newPkg.event_id);
            if (onRefreshQueue) onRefreshQueue();
          }}
        />
      )}

      {/* VS Code Quick Pick Style Batch Move Modal */}
      {isMoveModalOpen && (
        <BatchMoveModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          selectedCount={selectedIds.length}
          packages={availablePackages}
          onMove={async (targetEventId, targetTitle) => {
            if (onBatchAssignPackage) {
              await onBatchAssignPackage(selectedIds, targetEventId, targetTitle);
              setSelectedIds([]);
            }
          }}
        />
      )}
    </div>
  );
};
