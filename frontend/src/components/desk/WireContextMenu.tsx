import React, { useEffect, useRef } from 'react';
import type { MediaAsset } from '../../types';
import {
  CheckCircle2,
  Clock,
  Archive,
  ArchiveRestore,
  Trash2,
  Copy,
  CheckSquare,
} from 'lucide-react';

interface WireContextMenuProps {
  x: number;
  y: number;
  asset: MediaAsset;
  onClose: () => void;
  onUpdateStatus?: (public_id: string, status: 'approved' | 'action_required') => void;
  onArchiveToggle?: (public_id: string, is_archived: boolean) => void;
  onDeleteSingle?: (public_id: string) => void;
  onToggleSelect?: (public_id: string) => void;
  isSelected?: boolean;
}

export const WireContextMenu: React.FC<WireContextMenuProps> = ({
  x,
  y,
  asset,
  onClose,
  onUpdateStatus,
  onArchiveToggle,
  onDeleteSingle,
  onToggleSelect,
  isSelected = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position so it doesn't overflow viewport edges
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 260);

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = asset.secure_url || asset.syndication_urls?.feed_1_1 || '';
    if (url) {
      await navigator.clipboard.writeText(url);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-52 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-xl py-1 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Asset Identifier Header */}
      <div className="px-3 py-1.5 border-b border-slate-100">
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Asset Actions</p>
        <p className="text-xs font-semibold text-slate-800 truncate" title={asset.headline || asset.public_id}>
          {asset.headline || asset.public_id}
        </p>
      </div>

      <div className="py-1">
        {/* Toggle Status (Approve vs Triage) */}
        {onUpdateStatus && (
          <button
            onClick={() => {
              const nextStatus = asset.review_status === 'approved' ? 'action_required' : 'approved';
              onUpdateStatus(asset.public_id, nextStatus);
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-slate-50 transition cursor-pointer"
          >
            {asset.review_status === 'approved' ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Move Back to Triage</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark as Approved</span>
              </>
            )}
          </button>
        )}

        {/* Toggle Archive */}
        {onArchiveToggle && (
          <button
            onClick={() => {
              onArchiveToggle(asset.public_id, !asset.is_archived);
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-slate-50 transition cursor-pointer"
          >
            {asset.is_archived ? (
              <>
                <ArchiveRestore className="w-3.5 h-3.5 text-blue-600" />
                <span>Restore to Live Buffer</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5 text-slate-500" />
                <span>Move to Archive</span>
              </>
            )}
          </button>
        )}

        {/* Toggle Select */}
        {onToggleSelect && (
          <button
            onClick={() => {
              onToggleSelect(asset.public_id);
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-slate-50 transition cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>{isSelected ? 'Deselect Asset' : 'Select Asset'}</span>
          </button>
        )}

        {/* Copy CDN / Syndication URL */}
        <button
          onClick={handleCopyUrl}
          className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-slate-50 transition cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-slate-500" />
          <span>Copy Media URL</span>
        </button>
      </div>

      {/* Delete Action */}
      {onDeleteSingle && (
        <div className="border-t border-slate-100 pt-1">
          <button
            onClick={() => {
              onClose();
              if (window.confirm('Delete this asset from wire and Cloudinary?')) {
                onDeleteSingle(asset.public_id);
              }
            }}
            className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-rose-50 text-rose-600 transition cursor-pointer font-medium"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Delete Permanently</span>
          </button>
        </div>
      )}
    </div>
  );
};
