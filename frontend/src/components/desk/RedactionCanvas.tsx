import React, { useRef, useState, useEffect } from 'react';
import type { MediaAsset, FaceCoordinate } from '../../types';
import {
  Crosshair,
  Columns2,
  Plus,
  X,
  ZoomIn,
  ZoomOut,
  Tv,
  Smartphone,
  LayoutGrid,
  Info,
  Check,
  Copy,
  Download,
  Video,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  Layers,
  Loader2,
} from 'lucide-react';

interface RedactionCanvasProps {
  asset: MediaAsset;
  allAssets?: MediaAsset[];
  onSelectAsset?: (asset: MediaAsset) => void;
  onUpdateSuccess: (updatedAsset: MediaAsset) => void;
  onDeleteAsset?: (public_id: string) => void;
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
}

export const RedactionCanvas: React.FC<RedactionCanvasProps> = ({
  asset,
  allAssets,
  onSelectAsset,
  onUpdateSuccess,
  onDeleteAsset: _onDeleteAsset,
  onToggleInspector,
  isInspectorOpen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const siblingAngles = React.useMemo(() => {
    if (!asset.event_id || !allAssets) return [];
    return allAssets.filter((a) => a.event_id === asset.event_id && !a.is_archived);
  }, [asset.event_id, allAssets]);

  const [activePreviewMode, setActivePreviewMode] = useState<'canvas' | 'tv_16_9' | 'reel_9_16' | 'feed_1_1' | 'highlight_6s'>('canvas');
  const [faces, setFaces] = useState<FaceCoordinate[]>(asset.faces || []);
  const [showDiffSlider, setShowDiffSlider] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBlurPreviewVisible, setIsBlurPreviewVisible] = useState<boolean>(true);
  const [isVideoRedacted, setIsVideoRedacted] = useState<boolean>(
    asset.pixelate_bystanders !== undefined ? asset.pixelate_bystanders : true
  );

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  // Pan & Zoom Engine State (Figma / Photoshop style)
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drawing & Focal mode state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isFocalMode, setIsFocalMode] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // Dragging existing box state
  const [dragFace, setDragFace] = useState<{
    index: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  } | null>(null);

  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);
  const [hoveredFaceIndex, setHoveredFaceIndex] = useState<number | null>(null);

  const [displayDims, setDisplayDims] = useState<{ width: number; height: number; naturalWidth: number; naturalHeight: number }>({
    width: 0,
    height: 0,
    naturalWidth: 1200,
    naturalHeight: 800,
  });

  const currentAssetIdRef = useRef<string>(asset.public_id);
  const totalDetectedFacesRef = useRef<number>(asset.faces?.length || 0);

  const [isAngleDropdownOpen, setIsAngleDropdownOpen] = useState(false);
  const angleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAngleDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (angleDropdownRef.current && !angleDropdownRef.current.contains(e.target as Node)) {
        setIsAngleDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAngleDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAngleDropdownOpen]);

  useEffect(() => {
    if (currentAssetIdRef.current !== asset.public_id) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      setSyncStatus('idle');
      currentAssetIdRef.current = asset.public_id;
      totalDetectedFacesRef.current = asset.faces?.length || 0;
      setFaces(asset.faces || []);
      setIsDrawingMode(false);
      setDrawStart(null);
      setDrawCurrent(null);
      setDragFace(null);
      setSelectedFaceIndex(null);
      setHoveredFaceIndex(null);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setIsVideoRedacted(asset.pixelate_bystanders !== undefined ? asset.pixelate_bystanders : true);
      if (asset.resource_type === 'video') {
        setDisplayDims({ width: 0, height: 0, naturalWidth: asset.width || 1920, naturalHeight: asset.height || 1080 });
      }
    }
  }, [asset.public_id, asset.resource_type, asset.width, asset.height, asset.faces, asset.pixelate_bystanders]);

  const handleToggleVideoPrivacy = async (shouldBlur: boolean) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    setSyncStatus('syncing');
    setIsVideoRedacted(shouldBlur);
    const optimisticallyUpdated: MediaAsset = {
      ...asset,
      pixelate_bystanders: shouldBlur,
    };
    onUpdateSuccess(optimisticallyUpdated);

    try {
      const res = await fetch('/api/v1/editorial/redact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id: asset.public_id,
          face_coordinates: [],
          faces: [],
          headline: asset.headline || 'Breaking News',
          incident_type: asset.incident_type || 'uncategorized',
          urgency: asset.urgency || 'breaking',
          review_status: 'approved',
          pixelate_bystanders: shouldBlur,
        }),
      });
      if (res.ok) {
        const serverAsset: MediaAsset = await res.json();
        onUpdateSuccess(serverAsset);
        setSyncStatus('synced');
        syncTimerRef.current = setTimeout(() => {
          setSyncStatus('idle');
        }, 2200);
      } else {
        setSyncStatus('idle');
      }
    } catch (err) {
      console.error('Failed to toggle video privacy:', err);
      setSyncStatus('idle');
    }
  };

  const handleUpdateFocalPoint = async (
    targetX: number | null,
    targetY: number | null,
    targetGravity: string = 'auto:subject'
  ) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    setSyncStatus('syncing');

    const optimisticallyUpdated: MediaAsset = {
      ...asset,
      focal_x: targetX !== null ? targetX : undefined,
      focal_y: targetY !== null ? targetY : undefined,
      focal_gravity: targetGravity,
    };
    onUpdateSuccess(optimisticallyUpdated);

    try {
      const res = await fetch('/api/v1/editorial/focal-point', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id: asset.public_id,
          focal_x: targetX,
          focal_y: targetY,
          focal_gravity: targetGravity,
        }),
      });
      if (res.ok) {
        const serverAsset: MediaAsset = await res.json();
        onUpdateSuccess(serverAsset);
        setSyncStatus('synced');
        syncTimerRef.current = setTimeout(() => {
          setSyncStatus('idle');
        }, 2200);
      } else {
        setSyncStatus('idle');
      }
    } catch (err) {
      console.error('Failed to sync focal point:', err);
      setSyncStatus('idle');
    }
  };

  const switchPreviewMode = (mode: 'canvas' | 'tv_16_9' | 'reel_9_16' | 'feed_1_1' | 'highlight_6s') => {
    setActivePreviewMode(mode);
    setShowDiffSlider(false);
    setIsDrawingMode(false);
    setIsFocalMode(false);
    setDrawStart(null);
    setDrawCurrent(null);
    setDragFace(null);
    setSelectedFaceIndex(null);
  };

  const handleImageLoad = () => {
    if (imgRef.current) {
      setDisplayDims({
        width: imgRef.current.clientWidth,
        height: imgRef.current.clientHeight,
        naturalWidth: imgRef.current.naturalWidth || asset.width || 1200,
        naturalHeight: imgRef.current.naturalHeight || asset.height || 800,
      });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (imgRef.current) {
        setDisplayDims({
          width: imgRef.current.clientWidth,
          height: imgRef.current.clientHeight,
          naturalWidth: imgRef.current.naturalWidth || asset.width || 1200,
          naturalHeight: imgRef.current.naturalHeight || asset.height || 800,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [asset]);

  // Precise scale factor using actual rendered image box
  const refWidth = displayDims.naturalWidth > 0 ? displayDims.naturalWidth : (asset.width || 1200);
  const refHeight = displayDims.naturalHeight > 0 ? displayDims.naturalHeight : (asset.height || 800);
  const scaleX = displayDims.width > 0 ? displayDims.width / refWidth : 1;
  const scaleY = displayDims.height > 0 ? displayDims.height / refHeight : 1;

  const getNaturalCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const clickY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    return {
      x: rect.width > 0 ? (clickX / rect.width) * refWidth : 0,
      y: rect.height > 0 ? (clickY / rect.height) * refHeight : 0,
    };
  };

  // Native non-passive wheel zoom listener on viewport
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (activePreviewMode !== 'canvas') return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      setZoom((prev) => Math.min(3.5, Math.max(0.6, Number((prev * factor).toFixed(2)))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [activePreviewMode]);

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (asset.resource_type === 'video') return;
    if (isFocalMode) {
      e.preventDefault();
      const { x, y } = getNaturalCoords(e);
      handleUpdateFocalPoint(Math.round(x), Math.round(y), 'xy_center');
      setIsFocalMode(false);
      return;
    }
    if (isDrawingMode) {
      e.preventDefault();
      const { x, y } = getNaturalCoords(e);
      setDrawStart({ x, y });
      setDrawCurrent({ x, y });
    } else {
      setSelectedFaceIndex(null);
    }
  };

  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if (activePreviewMode !== 'canvas') return;
    if (
      isSpacePressed ||
      e.button === 1 ||
      (zoom > 1 && !isDrawingMode && !isFocalMode && !(e.target as HTMLElement).closest('[data-bounding-box]'))
    ) {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  // Keyboard shortcut listener (Space to Pan, Escape exits drawing/focal, Backspace/Delete deletes selected box)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === 'Escape') {
        setIsDrawingMode(false);
        setIsFocalMode(false);
        setDrawStart(null);
        setDrawCurrent(null);
        setDragFace(null);
        setSelectedFaceIndex(null);
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && selectedFaceIndex !== null && !isDrawingMode) {
        e.preventDefault();
        handleDeleteFace(selectedFaceIndex);
      } else if ((e.key === 'i' || e.key === 'I') && onToggleInspector && !isDrawingMode) {
        e.preventDefault();
        onToggleInspector();
      } else if (e.key === '1') {
        e.preventDefault();
        switchPreviewMode('canvas');
      } else if (e.key === '2') {
        e.preventDefault();
        switchPreviewMode('tv_16_9');
      } else if (e.key === '3') {
        e.preventDefault();
        switchPreviewMode('reel_9_16');
      } else if (e.key === '4') {
        e.preventDefault();
        switchPreviewMode('feed_1_1');
      } else if (e.key === '5' && asset.resource_type === 'video' && asset.syndication_urls?.video_highlight_6s) {
        e.preventDefault();
        switchPreviewMode('highlight_6s');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedFaceIndex, isDrawingMode, onToggleInspector, asset.resource_type, asset.syndication_urls]);

  // Global click-to-deselect listener: clicking anywhere outside an active box deselects it
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-bounding-box]')) {
        setSelectedFaceIndex(null);
      }
    };
    window.addEventListener('mousedown', handleGlobalMouseDown);
    return () => window.removeEventListener('mousedown', handleGlobalMouseDown);
  }, []);

  // Global mousemove and mouseup listeners for smooth drawing, dragging, and panning
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
      } else if (isDrawingMode && drawStart) {
        const { x, y } = getNaturalCoords(e);
        setDrawCurrent({ x, y });
      } else if (dragFace) {
        const { x, y } = getNaturalCoords(e);
        const deltaX = x - dragFace.startX;
        const deltaY = y - dragFace.startY;
        if (Math.hypot(deltaX, deltaY) > 3) {
          setFaces((prev) => {
            const updated = [...prev];
            const target = updated[dragFace.index];
            if (!target) return prev;
            const newX = Math.max(0, Math.min(refWidth - target.w, Math.round(dragFace.initialX + deltaX)));
            const newY = Math.max(0, Math.min(refHeight - target.h, Math.round(dragFace.initialY + deltaY)));
            updated[dragFace.index] = { ...target, x: newX, y: newY };
            return updated;
          });
          setDragFace((prev) => (prev ? { ...prev, hasMoved: true } : null));
        }
      }
    };

    const handleWindowMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
      if (drawStart && drawCurrent) {
        const x = Math.min(drawStart.x, drawCurrent.x);
        const y = Math.min(drawStart.y, drawCurrent.y);
        const w = Math.abs(drawCurrent.x - drawStart.x);
        const h = Math.abs(drawCurrent.y - drawStart.y);

        if (w > 15 && h > 15) {
          const newBox: FaceCoordinate = {
            id: `manual_${Date.now()}`,
            x: Math.round(x),
            y: Math.round(y),
            w: Math.round(w),
            h: Math.round(h),
            is_redacted: true, // Default to Redacted Civilian
            label: `Redaction #${faces.length + 1}`,
          };
          const newFaces = [...faces, newBox];
          setFaces(newFaces);
          syncFacesToBackend(newFaces);
        }
        setDrawStart(null);
        setDrawCurrent(null);
      }
      if (dragFace) {
        if (dragFace.hasMoved) {
          syncFacesToBackend(faces);
        }
        setDragFace(null);
      }
    };

    if (drawStart || dragFace || isPanning) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDrawingMode, drawStart, drawCurrent, dragFace, isPanning, scaleX, scaleY, refWidth, refHeight, faces]);

  const syncFacesToBackend = async (
    newFaces: FaceCoordinate[],
    newStatus?: 'approved' | 'action_required' | 'quarantined'
  ) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    setSyncStatus('syncing');
    const targetStatus: 'approved' | 'action_required' | 'quarantined' =
      newStatus || (newFaces.length === 0 ? 'approved' : asset.review_status);
    const bystanderCoordinates = newFaces.map((f) => [f.x, f.y, f.w, f.h]);

    // 1. Instant optimistic update to parent asset state (queue cards, review indicators, details)
    const optimisticallyUpdated: MediaAsset = {
      ...asset,
      faces: newFaces,
      review_status: targetStatus,
    };
    onUpdateSuccess(optimisticallyUpdated);

    // 2. Persist immediately to backend & Cloudinary explicit API
    try {
      const res = await fetch('/api/v1/editorial/redact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id: asset.public_id,
          face_coordinates: bystanderCoordinates,
          faces: newFaces,
          headline: asset.headline || 'Breaking News',
          incident_type: asset.incident_type || 'uncategorized',
          urgency: asset.urgency || 'breaking',
          review_status: targetStatus,
        }),
      });
      if (res.ok) {
        const serverAsset: MediaAsset = await res.json();
        onUpdateSuccess(serverAsset);
        setSyncStatus('synced');
        syncTimerRef.current = setTimeout(() => {
          setSyncStatus('idle');
        }, 2200);
      } else {
        setSyncStatus('idle');
      }
    } catch (err) {
      console.error('Failed to sync face changes to backend:', err);
      setSyncStatus('idle');
    }
  };

  const handleDeleteFace = (index: number) => {
    const newFaces = faces.filter((_, i) => i !== index);
    setFaces(newFaces);
    setSelectedFaceIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
    syncFacesToBackend(newFaces);
  };

  const handleApproveForWire = async () => {
    setSaving(true);
    try {
      await syncFacesToBackend(faces, 'approved');
      setToastMessage('Story Approved & Ready for Broadcast');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const [copiedPreviewKey, setCopiedPreviewKey] = useState<string | null>(null);

  const handleCopyUrl = (key: string, url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedPreviewKey(key);
    setTimeout(() => setCopiedPreviewKey(null), 2000);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col h-full space-y-3.5">
      {/* Sleek Single-Tier Broadcast Strip */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 min-w-0">
        {/* Left: Perspectives in Segmented Control */}
        <div className="flex items-center space-x-0.5 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60 shadow-2xs text-xs font-medium h-8 shrink-0">
          <button
            onClick={() => switchPreviewMode('canvas')}
            className={`px-2.5 h-full rounded-md transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap text-xs font-semibold ${
              activePreviewMode === 'canvas' && !showDiffSlider
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-blue-600" />
            <span>Triage</span>
            {asset.resource_type !== 'video' && faces.length > 0 && (
              <span className="ml-1 text-rose-600 font-mono font-bold text-[11px] leading-none">
                ({faces.length})
              </span>
            )}
          </button>

          <button
            onClick={() => switchPreviewMode('tv_16_9')}
            className={`px-2.5 h-full rounded-md transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap text-xs font-semibold ${
              activePreviewMode === 'tv_16_9' && !showDiffSlider
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-slate-500" />
            <span>16:9 Broadcast</span>
          </button>

          <button
            onClick={() => switchPreviewMode('reel_9_16')}
            className={`px-2.5 h-full rounded-md transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap text-xs font-semibold ${
              activePreviewMode === 'reel_9_16' && !showDiffSlider
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
            <span>9:16 Reel</span>
          </button>

          <button
            onClick={() => switchPreviewMode('feed_1_1')}
            className={`px-2.5 h-full rounded-md transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap text-xs font-semibold ${
              activePreviewMode === 'feed_1_1'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
            <span>1:1 Wire</span>
          </button>

          {asset.resource_type === 'video' && asset.syndication_urls?.video_highlight_6s && (
            <button
              onClick={() => switchPreviewMode('highlight_6s')}
              className={`px-2.5 h-full rounded-md transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap text-xs font-semibold ${
                activePreviewMode === 'highlight_6s' && !showDiffSlider
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-blue-600" />
              <span>6s Highlight</span>
            </button>
          )}
        </div>

        {/* Right: Primary Editorial Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Video Privacy Mode Switch (Bystander Mask vs Public Figures) */}
          {asset.resource_type === 'video' && (
            <div className="flex items-center space-x-0.5 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60 shadow-2xs text-xs font-medium h-8 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleVideoPrivacy(true)}
                className={`px-2 h-full rounded-md transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  isVideoRedacted
                    ? 'bg-white text-rose-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 font-medium'
                }`}
                title="Bystander Protection: AI automatically tracks and pixelates all moving civilian faces"
              >
                <ShieldAlert className={`w-3.5 h-3.5 ${isVideoRedacted ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Protect Bystanders</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleVideoPrivacy(false)}
                className={`px-2 h-full rounded-md transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  !isVideoRedacted
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 font-medium'
                }`}
                title="Public Figure Exemption: Air crisp unblurred footage for officials, anchors, or press conferences"
              >
                <Eye className={`w-3.5 h-3.5 ${!isVideoRedacted ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>Unblur (Public Figures)</span>
              </button>
            </div>
          )}

          {activePreviewMode !== 'canvas' && (
            <>
              {(() => {
                const currentModeUrl =
                  activePreviewMode === 'tv_16_9'
                    ? (asset.syndication_urls?.broadcast_16_9 || asset.syndication_urls?.broadcast_16_9_clean)
                    : activePreviewMode === 'reel_9_16'
                    ? asset.syndication_urls?.social_9_16
                    : activePreviewMode === 'highlight_6s'
                    ? asset.syndication_urls?.video_highlight_6s
                    : asset.syndication_urls?.feed_1_1;

                const modeLabel =
                  activePreviewMode === 'tv_16_9'
                    ? '16:9 Broadcast'
                    : activePreviewMode === 'reel_9_16'
                    ? '9:16 Reel'
                    : activePreviewMode === 'highlight_6s'
                    ? '6s Highlight'
                    : '1:1 Wire';

                const downloadUrl = currentModeUrl && currentModeUrl.includes('/upload/')
                  ? currentModeUrl.replace('/upload/', '/upload/fl_attachment/')
                  : currentModeUrl;

                return (
                  currentModeUrl && (
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(activePreviewMode, currentModeUrl)}
                        className="w-8 h-8 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg shadow-2xs transition flex items-center justify-center cursor-pointer active:scale-95"
                        title={copiedPreviewKey === activePreviewMode ? 'Copied to clipboard!' : `Copy ${modeLabel} URL`}
                      >
                        {copiedPreviewKey === activePreviewMode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-700" />
                        )}
                      </button>

                      {downloadUrl && (
                        <a
                          href={downloadUrl}
                          download
                          className="w-8 h-8 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg shadow-2xs transition flex items-center justify-center cursor-pointer active:scale-95"
                          title={`Direct download ${modeLabel} master`}
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500 hover:text-slate-700" />
                        </a>
                      )}
                    </div>
                  )
                );
              })()}
            </>
          )}

          {/* Approve for Wire / Editorial Sign-off */}
          {asset.review_status === 'approved' ? (
            <div
              className="h-8 px-2.5 bg-emerald-50/80 text-emerald-800 border border-emerald-200/70 rounded-lg text-xs font-semibold flex items-center shadow-2xs select-none"
              title="Story cleared & ready for wire broadcast"
            >
              <span className="text-[11px] tracking-tight">Approved for Wire</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleApproveForWire}
              disabled={saving}
              className="h-8 px-3 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-xs hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap"
              title="Approve all redactions and clear for wire broadcast"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white/90" />
                  <span>Approving...</span>
                </>
              ) : (
                <span>Approve Dispatch</span>
              )}
            </button>
          )}

          {onToggleInspector && (
            <button
              type="button"
              onClick={onToggleInspector}
              className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap active:scale-95 ${
                isInspectorOpen
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs font-semibold'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/90 shadow-2xs'
              }`}
              title="Story Provenance, Telemetry & Export (Shortcut: I)"
            >
              <Info className={`w-3.5 h-3.5 ${isInspectorOpen ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Details</span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-Angle Coverage Strip for Clustered Events */}
      {siblingAngles.length > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/90 border border-slate-200/80 rounded-xl text-xs select-none">
          <div className="flex items-center space-x-1.5 truncate mr-2 min-w-0">
            <span className="text-xs font-semibold text-slate-800 truncate leading-none">
              {asset.event_title || asset.headline}
            </span>
            <span className="text-slate-300 font-normal text-xs leading-none select-none">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 shrink-0 leading-none">
              <Layers className="w-2.5 h-2.5 text-slate-400 shrink-0 stroke-[2.2]" />
              <span>{siblingAngles.length}</span>
            </span>
          </div>

          <div className="relative shrink-0" ref={angleDropdownRef}>
            <button
              type="button"
              onClick={() => setIsAngleDropdownOpen((prev) => !prev)}
              className="h-6 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 rounded-lg text-[11px] font-medium flex items-center space-x-1.5 transition cursor-pointer shadow-2xs"
              title="Switch camera angle"
            >
              <span>Angle {Math.max(1, siblingAngles.findIndex((s) => s.public_id === asset.public_id) + 1)}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isAngleDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAngleDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 max-h-60 overflow-y-auto modern-scrollbar bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                {siblingAngles.map((sibling, idx) => {
                  const isActive = sibling.public_id === asset.public_id;
                  return (
                    <button
                      key={sibling.public_id}
                      type="button"
                      onClick={() => {
                        if (onSelectAsset) onSelectAsset(sibling);
                        setIsAngleDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition text-left ${
                        isActive
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'hover:bg-slate-100 text-slate-700 font-medium'
                      }`}
                    >
                      <div
                        className="flex items-center space-x-1.5 truncate min-w-0 pr-2 py-0.5"
                        title={sibling.headline || `Angle ${idx + 1}`}
                      >
                        <span className="font-mono text-[10px] text-slate-400 font-semibold shrink-0 w-3.5 text-right">
                          {idx + 1}.
                        </span>
                        <span className="truncate text-[11px] leading-snug">
                          {sibling.headline || `Angle ${idx + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center shrink-0">
                        <span className="text-[10px] text-slate-400 capitalize">
                          {sibling.resource_type === 'video' ? 'Video' : 'Photo'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div
        ref={viewportRef}
        onMouseDown={handleViewportMouseDown}
        style={{
          backgroundColor: '#f8fafc',
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1.25px, transparent 1.25px)',
          backgroundSize: '20px 20px',
          backgroundPosition: activePreviewMode === 'canvas' ? `${pan.x}px ${pan.y}px` : '0px 0px',
        }}
        className={`relative mx-auto rounded-2xl overflow-hidden border border-slate-200 shadow-[inset_0_2px_8px_rgba(0,0,0,0.03)] flex justify-center items-center flex-1 min-h-[260px] w-full select-none ${
          activePreviewMode !== 'canvas'
            ? 'cursor-default'
            : isPanning
            ? 'cursor-grabbing'
            : isSpacePressed
            ? 'cursor-grab'
            : isDrawingMode || isFocalMode
            ? 'cursor-crosshair'
            : zoom > 1
            ? 'cursor-grab'
            : 'cursor-default'
        }`}
      >
        {/* Video Privacy Status Pill */}
        {asset.resource_type === 'video' && activePreviewMode === 'canvas' && (
          <div className="absolute top-3.5 left-3.5 z-30 flex items-center space-x-2 bg-white/95 backdrop-blur-md border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-lg shadow-slate-900/5 select-none text-xs">
            <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isVideoRedacted ? 'text-rose-600' : 'text-emerald-600'}`} />
            <span className={`font-semibold ${isVideoRedacted ? 'text-rose-600' : 'text-emerald-600'}`}>
              {isVideoRedacted ? 'AI Face Blur Active' : 'Clean Video Feed'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              {isVideoRedacted ? '· All moving faces masked' : '· Unblurred public figures'}
            </span>
          </div>
        )}

        {/* Floating Canvas Micro-Dock in Edit Zone */}
        {activePreviewMode === 'canvas' && (
          <div className="absolute top-3.5 right-3.5 z-40 flex items-center space-x-1 bg-white/90 backdrop-blur-md border border-slate-200/90 p-1 rounded-xl shadow-lg shadow-slate-900/5 select-none">
            {/* Set Editorial Focal Target (Photos Only) */}
            {asset.resource_type !== 'video' && (
              <div className="relative group flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsFocalMode(!isFocalMode);
                    if (!isFocalMode) {
                      setIsDrawingMode(false);
                      setShowDiffSlider(false);
                    }
                  }}
                  className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                    isFocalMode
                      ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-2xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-medium rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                  {isFocalMode ? 'Exit Focal Target (Esc)' : 'Set Editorial Focal Target (Click to Place)'}
                </div>
              </div>
            )}

            {/* Add Box Tool (Photos Only) */}
            {asset.resource_type !== 'video' && (
              <div className="relative group flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (showDiffSlider) setShowDiffSlider(false);
                    setIsDrawingMode(!isDrawingMode);
                    if (!isDrawingMode) setIsFocalMode(false);
                  }}
                  className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                    isDrawingMode
                      ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-2xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                  }`}
                >
                  <Plus className={`w-4 h-4 transition-transform duration-150 ${isDrawingMode ? 'rotate-45' : ''}`} />
                </button>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-medium rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                  {isDrawingMode ? 'Exit Drawing (Esc)' : 'Add Redaction Box'}
                </div>
              </div>
            )}

            {/* Toggle Frosted Blur Preview on Canvas (Photos Only) */}
            {asset.resource_type !== 'video' && (
              <div className="relative group flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsBlurPreviewVisible(!isBlurPreviewVisible)}
                  className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                    isBlurPreviewVisible
                      ? 'border-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/90'
                      : 'border-amber-300 bg-amber-50 text-amber-700'
                  }`}
                  title={isBlurPreviewVisible ? 'Privacy blur preview ON' : 'Privacy blur preview OFF'}
                >
                  {isBlurPreviewVisible ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                  )}
                </button>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-medium rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                  {isBlurPreviewVisible ? 'Privacy blur active (Click to inspect raw faces)' : 'Raw faces visible (Click to preview blur)'}
                </div>
              </div>
            )}

            {/* Split Diff Comparison Tool */}
            <div className="relative group flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setShowDiffSlider(!showDiffSlider);
                  if (!showDiffSlider) setIsDrawingMode(false);
                }}
                className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                  showDiffSlider
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-medium rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                {showDiffSlider ? 'Exit Diff View' : 'Split Diff Comparison'}
              </div>
            </div>

            <div className="w-[1px] h-4 bg-slate-200/90 mx-0.5" />

            {/* Zoom Out */}
            <div className="relative group flex items-center justify-center">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.6, Number((prev - 0.25).toFixed(2))))}
                className="w-7 h-7 rounded-lg border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-medium rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                Zoom Out
              </div>
            </div>

            {/* Zoom Percentage / Reset to 100% */}
            <div className="relative group flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setZoom(1.0);
                  setPan({ x: 0, y: 0 });
                }}
                className="px-2 h-7 rounded-lg border border-transparent text-[11px] font-mono font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100/90 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              >
                {Math.round(zoom * 100)}%
              </button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-medium rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                Reset to 100%
              </div>
            </div>

            {/* Zoom In */}
            <div className="relative group flex items-center justify-center">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3.5, Number((prev + 0.25).toFixed(2))))}
                className="w-7 h-7 rounded-lg border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 transition-all flex items-center justify-center cursor-pointer active:scale-95"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-medium rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                Zoom In
              </div>
            </div>
          </div>
        )}

        {/* Mode A: Standard Interactive Face Triage */}
        {!showDiffSlider && activePreviewMode === 'canvas' && (
          <div className="relative w-full h-full flex justify-center items-center p-2 select-none overflow-hidden">
            {/* Zoom & Pan Transformation Container */}
            <div
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.08s ease-out',
              }}
              className="relative inline-block"
            >
              {/* Inner image wrapper that wraps EXACTLY around the rendered image */}
              <div
                ref={containerRef}
                onMouseDown={handleContainerMouseDown}
                className={`relative inline-block ${isDrawingMode ? 'cursor-crosshair' : ''}`}
              >
                {asset.resource_type === 'video' ? (
                  <video
                    key={`${asset.public_id}_triage_${isVideoRedacted ? 'redacted' : 'clean'}`}
                    src={
                      isVideoRedacted
                        ? (asset.syndication_urls?.clean_master || asset.secure_url)
                        : asset.secure_url
                    }
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-h-[520px] w-auto object-contain block select-none rounded-lg shadow-2xl ring-1 ring-slate-900/10"
                  />
                ) : (
                  <img
                    ref={imgRef}
                    src={asset.secure_url}
                    alt="Subject Triage"
                    onLoad={handleImageLoad}
                    className="max-h-[520px] w-auto object-contain block pointer-events-none select-none rounded-lg shadow-2xl ring-1 ring-slate-900/10"
                    draggable={false}
                  />
                )}

                {/* Clean Editorial Focal Target Reticle (Photos Only) */}
                {asset.resource_type !== 'video' && (isFocalMode || (asset.focal_x != null && asset.focal_y != null)) && displayDims.width > 0 && (() => {
                  const focalX = asset.focal_x != null ? asset.focal_x : Math.round(refWidth / 2);
                  const focalY = asset.focal_y != null ? asset.focal_y : Math.round(refHeight / 2);

                  return (
                    <div
                      style={{
                        left: `${focalX * scaleX}px`,
                        top: `${focalY * scaleY}px`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-all duration-150 z-30"
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-white bg-white/20 flex items-center justify-center shadow-[0_0_6px_rgba(0,0,0,0.6)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
                      </div>
                    </div>
                  );
                })()}

                {/* Drawing in-progress preview rectangle (Photos Only) */}
              {asset.resource_type !== 'video' && drawStart && drawCurrent && (
                <div
                  style={{
                    left: `${Math.min(drawStart.x, drawCurrent.x) * scaleX}px`,
                    top: `${Math.min(drawStart.y, drawCurrent.y) * scaleY}px`,
                    width: `${Math.abs(drawCurrent.x - drawStart.x) * scaleX}px`,
                    height: `${Math.abs(drawCurrent.y - drawStart.y) * scaleY}px`,
                  }}
                  className="absolute border border-dashed border-blue-500 bg-blue-500/15 backdrop-blur-sm rounded pointer-events-none z-30"
                />
              )}

              {/* Bounding box layer (Photos Only) */}
              {asset.resource_type !== 'video' &&
                displayDims.width > 0 &&
                faces.map((f, idx) => {
                  const left = f.x * scaleX;
                  const top = f.y * scaleY;
                  const width = f.w * scaleX;
                  const height = f.h * scaleY;
                  const isSelected = selectedFaceIndex === idx;
                  const isHovered = hoveredFaceIndex === idx;
                  const zIndex = isSelected ? 40 : isHovered ? 35 : 20;

                  return (
                    <div
                      key={f.id || idx}
                      data-bounding-box="true"
                      onMouseEnter={() => setHoveredFaceIndex(idx)}
                      onMouseLeave={() => setHoveredFaceIndex((prev) => (prev === idx ? null : prev))}
                      onMouseDown={(e) => {
                        if (isDrawingMode || isSpacePressed) return;
                        e.stopPropagation();
                        e.preventDefault();
                        setSelectedFaceIndex(idx);
                        const { x, y } = getNaturalCoords(e);
                        setDragFace({
                          index: idx,
                          startX: x,
                          startY: y,
                          initialX: f.x,
                          initialY: f.y,
                          hasMoved: false,
                        });
                      }}
                      style={{
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                        zIndex: zIndex,
                      }}
                      className={`absolute border transition-all select-none rounded-lg group ${
                        isDrawingMode
                          ? 'pointer-events-none'
                          : 'cursor-grab active:cursor-grabbing'
                      } ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-xl'
                          : isHovered
                          ? 'border-rose-400 ring-1 ring-rose-400/30 shadow-md'
                          : 'border-rose-400/80 shadow-xs'
                      } ${
                        isBlurPreviewVisible
                          ? 'backdrop-blur-md bg-slate-900/10 hover:bg-slate-900/5'
                          : 'bg-transparent'
                      }`}
                    >
                      {/* High-Tech Viewfinder Corner Accents */}
                      <span className={`absolute -top-[1.5px] -left-[1.5px] w-2 h-2 border-t-2 border-l-2 pointer-events-none rounded-tl-xs ${isSelected ? 'border-blue-500' : 'border-rose-500'}`} />
                      <span className={`absolute -top-[1.5px] -right-[1.5px] w-2 h-2 border-t-2 border-r-2 pointer-events-none rounded-tr-xs ${isSelected ? 'border-blue-500' : 'border-rose-500'}`} />
                      <span className={`absolute -bottom-[1.5px] -left-[1.5px] w-2 h-2 border-b-2 border-l-2 pointer-events-none rounded-bl-xs ${isSelected ? 'border-blue-500' : 'border-rose-500'}`} />
                      <span className={`absolute -bottom-[1.5px] -right-[1.5px] w-2 h-2 border-b-2 border-r-2 pointer-events-none rounded-br-xs ${isSelected ? 'border-blue-500' : 'border-rose-500'}`} />

                      {/* Minimalist Micro-Tag on Hover/Select */}
                      {(isHovered || isSelected) && (
                        <span className="absolute -top-5 left-0 bg-slate-900/90 text-white text-[9px] font-mono font-medium px-1.5 py-0.5 rounded shadow-sm pointer-events-none tracking-wider select-none whitespace-nowrap">
                          Face #{idx + 1}
                        </span>
                      )}

                      {/* Discrete Remove Button at Top-Right Corner */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFace(idx);
                        }}
                        title="Delete redaction box (Shortcut: Backspace/Delete)"
                        className={`absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-slate-900/95 hover:bg-rose-600 text-white flex items-center justify-center transition-all duration-150 cursor-pointer shadow-md hover:scale-110 active:scale-95 shrink-0 z-30 ${
                          isHovered || isSelected
                            ? 'opacity-100 scale-100 pointer-events-auto'
                            : 'opacity-0 scale-75 pointer-events-none'
                        }`}
                      >
                        <X className="w-3 h-3 stroke-[2.5]" />
                      </button>

                      </div>
                    );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Ephemeral Real-Time CDN Sync Feedback (Lower-Left Viewport) */}
        <div
          className={`absolute bottom-3 left-3 z-30 flex items-center space-x-1.5 pointer-events-none select-none text-[11px] font-mono tracking-tight transition-all duration-300 ${
            syncStatus !== 'idle'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-1'
          }`}
        >
          {syncStatus === 'syncing' ? (
            <span className="text-slate-500 font-medium flex items-center gap-1.5 drop-shadow-xs">
              <Loader2 className="w-3 h-3 animate-spin text-slate-400 shrink-0" />
              <span>Syncing privacy mask to CDN...</span>
            </span>
          ) : (
            <span className="text-emerald-700 font-semibold drop-shadow-xs">
              Privacy mask synced to CDN
            </span>
          )}
        </div>

        {/* Floating Notification Toast */}
        {toastMessage && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md text-slate-900 px-3.5 py-1.5 rounded-lg shadow-xl text-xs font-medium flex items-center space-x-2 border border-slate-200/90 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Mode B: Before/After Split Diff Slider */}
        {showDiffSlider && (
          <div className="relative w-auto h-[480px] max-h-[520px] rounded-lg shadow-2xl overflow-hidden ring-1 ring-slate-900/10 flex items-center justify-center select-none">
            {/* Raw Original Layer */}
            <img
              src={asset.secure_url}
              alt=""
              className="w-full h-full object-contain"
            />

            {/* Redacted & Packaged Layer (Clipped by slider) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={asset.syndication_urls?.broadcast_16_9_clean || asset.syndication_urls?.clean_master || asset.syndication_urls?.broadcast_16_9 || asset.secure_url}
                alt=""
                className="absolute inset-0 w-full h-full object-contain filter"
                style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }}
              />
            </div>

            {/* Split Divider Bar */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="w-6 h-6 rounded-full bg-white text-blue-600 shadow-md flex items-center justify-center text-[10px] font-bold">
                ⇄
              </div>
            </div>

            {/* Range Input Slider Controller */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
            />
          </div>
        )}

        {/* Docked Framing Controls for Syndication Previews */}
        {(activePreviewMode === 'reel_9_16' || activePreviewMode === 'feed_1_1' || activePreviewMode === 'tv_16_9') && asset.resource_type !== 'video' && (
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-40 flex items-center space-x-2 bg-white/95 backdrop-blur-md border border-slate-200/90 py-1 px-3 rounded-xl shadow-lg shadow-slate-900/5 select-none text-xs animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center space-x-1.5 pr-2 border-r border-slate-200/80">
              <Crosshair className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-medium text-slate-700">
                {asset.focal_x != null && asset.focal_y != null && asset.focal_gravity !== 'center'
                  ? 'Focal: Custom'
                  : 'Focal: Center'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleUpdateFocalPoint(Math.round(refWidth / 2), Math.round(refHeight / 2), 'center')}
              className="px-2 py-0.5 rounded-md hover:bg-slate-100 text-[11px] text-slate-700 font-medium cursor-pointer transition active:scale-95"
              title="Center crop to image midpoint"
            >
              Center
            </button>
          </div>
        )}

        {/* Mode C: 16:9 Broadcast Overlay */}
        {!showDiffSlider && activePreviewMode === 'tv_16_9' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            {asset.resource_type === 'video' ? (
              <video
                key={`${asset.public_id}_tv_${isVideoRedacted ? 'redacted' : 'clean'}`}
                src={asset.syndication_urls?.broadcast_16_9_clean || asset.syndication_urls?.broadcast_16_9 || asset.secure_url}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="max-h-[500px] max-w-full rounded-lg object-contain shadow-2xl ring-1 ring-slate-900/10"
              />
            ) : (
              <img
                src={asset.syndication_urls?.broadcast_16_9_clean || asset.syndication_urls?.clean_master || asset.syndication_urls?.broadcast_16_9 || asset.secure_url}
                alt="16:9 Broadcast Feed"
                className="max-h-[500px] max-w-full rounded-lg object-contain shadow-2xl ring-1 ring-slate-900/10 select-none"
              />
            )}
          </div>
        )}

        {/* Mode D: 9:16 Social Reel */}
        {!showDiffSlider && activePreviewMode === 'reel_9_16' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            {asset.resource_type === 'video' ? (
              <video
                key={`${asset.public_id}_reel_${isVideoRedacted ? 'redacted' : 'clean'}`}
                src={asset.syndication_urls?.social_9_16 || asset.secure_url}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="max-h-[500px] w-auto rounded-xl object-contain shadow-2xl ring-1 ring-slate-900/10"
              />
            ) : (
              <img
                src={asset.syndication_urls?.social_9_16 || asset.secure_url}
                alt="9:16 Social Reel"
                className="max-h-[500px] w-auto rounded-xl object-contain shadow-2xl ring-1 ring-slate-900/10 select-none"
              />
            )}
          </div>
        )}

        {/* Mode E: 1:1 Wire Card */}
        {!showDiffSlider && activePreviewMode === 'feed_1_1' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            {asset.resource_type === 'video' ? (
              <video
                key={`${asset.public_id}_feed_${isVideoRedacted ? 'redacted' : 'clean'}`}
                src={
                  isVideoRedacted
                    ? (asset.syndication_urls?.feed_1_1 || asset.secure_url)
                    : asset.secure_url
                }
                controls
                autoPlay
                loop
                muted
                playsInline
                className="max-h-[480px] aspect-square rounded-xl object-cover shadow-2xl ring-1 ring-slate-900/10"
              />
            ) : (
              <img
                src={asset.syndication_urls?.feed_1_1 || asset.secure_url}
                alt="1:1 Micro Card"
                className="max-h-[480px] aspect-square rounded-xl object-cover shadow-2xl ring-1 ring-slate-900/10 select-none"
              />
            )}
          </div>
        )}

        {/* Mode F: 6s Highlight Reel */}
        {!showDiffSlider && activePreviewMode === 'highlight_6s' && asset.syndication_urls?.video_highlight_6s && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <video
              src={asset.syndication_urls.video_highlight_6s}
              controls
              autoPlay
              loop
              muted
              playsInline
              className="max-h-[500px] max-w-full rounded-lg object-contain shadow-2xl ring-1 ring-slate-900/10"
            />
          </div>
        )}
      </div>
    </div>
  );
};
