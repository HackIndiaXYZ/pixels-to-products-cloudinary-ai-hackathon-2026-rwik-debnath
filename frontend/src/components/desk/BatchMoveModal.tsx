import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Layers,
  FolderMinus,
  Plus,
  Lock,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import { getCategoryMeta } from '../../utils/categories';

export interface PackageOption {
  event_id: string;
  title: string;
  count: number;
  incident_type?: string;
  package_status?: 'active' | 'concluded' | 'locked';
}

interface BatchMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  packages: PackageOption[];
  onMove: (targetEventId: string | null, targetTitle?: string | null) => Promise<void>;
}

export const BatchMoveModal: React.FC<BatchMoveModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  packages,
  onMove,
}) => {
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset search and active index whenever opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(0);
      setIsSubmitting(false);
      // Small timeout to allow render before focusing input
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filter packages based on search query
  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((pkg) => {
      const matchTitle = pkg.title.toLowerCase().includes(q);
      const matchDesk = pkg.incident_type?.toLowerCase().includes(q);
      return matchTitle || matchDesk;
    });
  }, [packages, search]);

  // Check if search matches standalone option
  const showStandalone = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      'standalone stories'.includes(q) ||
      'independent wire'.includes(q) ||
      'detach'.includes(q) ||
      'none'.includes(q)
    );
  }, [search]);

  // Option to create a new package on the fly
  const showCreateOption = useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed) return false;
    const exactExists = packages.some(
      (p) => p.title.toLowerCase() === trimmed.toLowerCase()
    );
    return !exactExists;
  }, [packages, search]);

  // Construct flat list of actionable item identifiers for arrow navigation
  type ActionableItem =
    | { type: 'standalone' }
    | { type: 'package'; pkg: PackageOption }
    | { type: 'create'; title: string };

  const actionableItems = useMemo<ActionableItem[]>(() => {
    const items: ActionableItem[] = [];
    if (showStandalone) {
      items.push({ type: 'standalone' });
    }
    filteredPackages.forEach((pkg) => {
      items.push({ type: 'package', pkg });
    });
    if (showCreateOption) {
      items.push({ type: 'create', title: search.trim() });
    }
    return items;
  }, [showStandalone, filteredPackages, showCreateOption, search]);

  // Reset activeIndex if items change and current index exceeds bounds
  useEffect(() => {
    if (activeIndex >= actionableItems.length) {
      setActiveIndex(Math.max(0, actionableItems.length - 1));
    }
  }, [actionableItems.length, activeIndex]);

  // Scroll active item into view
  useEffect(() => {
    const targetEl = itemRefs.current[activeIndex];
    if (targetEl) {
      targetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  const handleSelectItem = async (item: ActionableItem) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (item.type === 'standalone') {
        await onMove(null, null);
      } else if (item.type === 'package') {
        await onMove(item.pkg.event_id, item.pkg.title);
      } else if (item.type === 'create') {
        const slug = item.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        const eventId = `evt_${slug || Date.now()}`;
        await onMove(eventId, item.title);
      }
      onClose();
    } catch (err) {
      console.error('Failed to move assets:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (!actionableItems.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % actionableItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + actionableItems.length) % actionableItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentItem = actionableItems[activeIndex];
      if (currentItem) {
        handleSelectItem(currentItem);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/45 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* VS Code Command Palette Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100 bg-slate-50/60 gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Type a package name or select Standalone Stories..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 shrink-0">
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
              {selectedCount} selected
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Scrollable Results List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 space-y-1 divide-y divide-slate-100/60
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-slate-200
            hover:[&::-webkit-scrollbar-thumb]:bg-slate-300
            [&::-webkit-scrollbar-track]:bg-transparent"
        >
          {actionableItems.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <Layers className="w-6 h-6 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No matching packages</p>
              <p className="text-[11px] text-slate-400">
                No story packages matched &ldquo;{search}&rdquo;. Press Enter to create a new one or clear your search.
              </p>
            </div>
          ) : (
            actionableItems.map((item, idx) => {
              const isSelected = activeIndex === idx;

              if (item.type === 'standalone') {
                return (
                  <div key="action-standalone" className="pt-1 first:pt-0">
                    <button
                      ref={(el) => { itemRefs.current[idx] = el; }}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 text-blue-900 border border-blue-200/80 shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <FolderMinus className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold truncate">Standalone Stories</span>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              Independent Wire
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            Detach {selectedCount} selected stories from any active packages
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-400 shrink-0 ml-3">
                        {isSelected ? (
                          <span className="text-[10px] font-semibold text-blue-600 flex items-center space-x-1">
                            <span>Move</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </span>
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                        )}
                      </div>
                    </button>
                  </div>
                );
              }

              if (item.type === 'create') {
                return (
                  <div key={`action-create-${item.title}`} className="pt-1">
                    <button
                      ref={(el) => { itemRefs.current[idx] = el; }}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 text-blue-900 border border-blue-200/80 shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white shadow-2xs' : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-blue-600 truncate">
                              Create &amp; Move to: &ldquo;{item.title}&rdquo;
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                              New Package
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            Create a new story package with the {selectedCount} selected stories
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-400 shrink-0 ml-3">
                        {isSelected ? (
                          <span className="text-[10px] font-semibold text-blue-600 flex items-center space-x-1">
                            <span>Create</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </span>
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                        )}
                      </div>
                    </button>
                  </div>
                );
              }

              const pkg = item.pkg;
              const cat = getCategoryMeta(pkg.incident_type);
              const isLocked = pkg.package_status === 'concluded' || pkg.package_status === 'locked';

              return (
                <div key={pkg.event_id} className="pt-1">
                  <button
                    ref={(el) => { itemRefs.current[idx] = el; }}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/90 text-blue-900 border border-blue-200/80 shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-800 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${cat.dotColor}`} />
                          <span className="text-xs font-bold truncate">{pkg.title}</span>
                          {isLocked && (
                            <span
                              className="text-slate-400 flex items-center shrink-0"
                              title="Locked / Concluded package"
                            >
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{cat.label}</span>
                          <span>&bull;</span>
                          <span>
                            {pkg.count} {pkg.count === 1 ? 'story' : 'stories'} currently
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 ml-3">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        +{selectedCount}
                      </span>
                      {isSelected ? (
                        <span className="text-[10px] font-semibold text-blue-600 flex items-center space-x-1">
                          <span>Move</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </span>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Helpers */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center text-[11px] text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9.5px] font-mono text-slate-500 shadow-2xs">
                &uarr;
              </kbd>
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9.5px] font-mono text-slate-500 shadow-2xs">
                &darr;
              </kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9.5px] font-mono text-slate-500 shadow-2xs">
                &crarr;
              </kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9.5px] font-mono text-slate-500 shadow-2xs">
                esc
              </kbd>
              <span>to cancel</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
