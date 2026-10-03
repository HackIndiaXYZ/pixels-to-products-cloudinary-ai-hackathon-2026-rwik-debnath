import { useState, useEffect, useRef } from 'react';
import type { MediaAsset, StoryPackage } from './types';
import { WireQueue } from './components/desk/WireQueue';
import { ProvenanceCard } from './components/desk/ProvenanceCard';
import { PackageInspector } from './components/desk/PackageInspector';
import { RedactionCanvas } from './components/desk/RedactionCanvas';
import { SubmitPortal } from './components/portal/SubmitPortal';
import { BrandHome } from './components/brand/BrandHome';
import { Clock, Share2, Check, UploadCloud } from 'lucide-react';
import { PressWireLogo } from './components/brand/PressWireLogo';

export function App() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [packages, setPackages] = useState<StoryPackage[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [tipLinkCopied, setTipLinkCopied] = useState(false);
  const [isDragOverCenter, setIsDragOverCenter] = useState(false);
  const centralFileInputRef = useRef<HTMLInputElement>(null);

  // Real-time Server-Sent Events (SSE) state & toast notifications
  const [sseConnected, setSseConnected] = useState(false);
  const [liveToast, setLiveToast] = useState<{ id: string; headline: string; public_id: string } | null>(null);
  const liveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global hotkey: 'i' or 'I' toggles the Provenance/Export inspector drawer, 'Escape' closes it
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if ((e.key === 'i' || e.key === 'I') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowInspector((prev) => !prev);
      } else if (e.key === 'Escape' && showInspector) {
        setShowInspector(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInspector]);

  // Client-side URL route detection (root '/' vs '/desk' vs '/submit')
  const [currentRoute, setCurrentRoute] = useState<'brand' | 'desk' | 'submit'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/submit' || path === '/submit/') return 'submit';
      if (path === '/desk' || path === '/desk/') return 'desk';
      if (path === '/' || path === '') return 'brand';
    }
    return 'brand';
  });

  const navigateTo = (route: 'brand' | 'desk' | 'submit') => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      const targetPath = route === 'submit' ? '/submit' : route === 'desk' ? '/desk' : '/';
      window.history.pushState({ route }, '', targetPath);
    }
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/submit' || path === '/submit/') setCurrentRoute('submit');
      else if (path === '/desk' || path === '/desk/') setCurrentRoute('desk');
      else setCurrentRoute('brand');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleCopyTipLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/submit`;
      navigator.clipboard.writeText(url);
      setTipLinkCopied(true);
      setTimeout(() => setTipLinkCopied(false), 2000);
    }
  };

  // Keep a ref to the currently selected public_id to preserve selection across periodic background polls
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedAsset?.public_id || null;
  }, [selectedAsset]);

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/v1/editorial/packages');
      if (res.ok) {
        const data: StoryPackage[] = await res.json();
        setPackages(data);
      }
    } catch (err) {
      console.error('Error fetching story packages:', err);
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/v1/editorial/queue');
      if (res.ok) {
        const data: MediaAsset[] = await res.json();
        setAssets(data);

        if (data.length > 0) {
          const currentId = selectedIdRef.current;
          if (currentId) {
            const matching = data.find((a) => a.public_id === currentId);
            if (matching) {
              setSelectedAsset((prev) => {
                if (!prev) return matching;
                if (
                  prev.public_id !== matching.public_id ||
                  prev.review_status !== matching.review_status ||
                  prev.faces.length !== matching.faces.length ||
                  prev.is_archived !== matching.is_archived ||
                  prev.urgency !== matching.urgency ||
                  prev.headline !== matching.headline ||
                  prev.incident_type !== matching.incident_type ||
                  prev.event_id !== matching.event_id ||
                  prev.event_title !== matching.event_title ||
                  prev.cluster_radius_km !== matching.cluster_radius_km ||
                  prev.telemetry?.gps_latitude !== matching.telemetry?.gps_latitude ||
                  prev.telemetry?.gps_longitude !== matching.telemetry?.gps_longitude
                ) {
                  return matching;
                }
                return prev;
              });
            }
          } else {
            setSelectedAsset(data[0]);
          }
        } else {
          setSelectedAsset(null);
        }
        await fetchPackages();
      }
    } catch (err) {
      console.error('Error fetching wire queue:', err);
    }
  };

  // Initial fetch and relaxed fallback poll (45s safety net)
  useEffect(() => {
    fetchQueue();
    fetchPackages();
    const interval = setInterval(() => {
      fetchQueue();
      fetchPackages();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Server-Sent Events (SSE) Real-time wire subscription (<200ms latency)
  useEffect(() => {
    let es: EventSource | null = null;

    const connectSSE = () => {
      try {
        es = new EventSource('/api/v1/editorial/stream');

        es.onopen = () => {
          setSseConnected(true);
        };

        es.addEventListener('connected', () => {
          setSseConnected(true);
        });

        es.addEventListener('asset:ingested', (e: MessageEvent) => {
          try {
            const newAsset: MediaAsset = JSON.parse(e.data);
            setAssets((prev) => {
              if (prev.some((a) => a.public_id === newAsset.public_id)) {
                return prev.map((a) => (a.public_id === newAsset.public_id ? newAsset : a));
              }
              return [newAsset, ...prev];
            });

            // Trigger sleek breaking wire alert notification
            if (liveToastTimerRef.current) clearTimeout(liveToastTimerRef.current);
            setLiveToast({
              id: String(Date.now()),
              headline: newAsset.headline || 'BREAKING WIRE MEDIA INGESTED',
              public_id: newAsset.public_id,
            });
            liveToastTimerRef.current = setTimeout(() => {
              setLiveToast(null);
            }, 5000);

            fetchPackages();
          } catch (err) {
            console.error('[SSE] Failed parsing asset:ingested', err);
          }
        });

        es.addEventListener('asset:updated', (e: MessageEvent) => {
          try {
            const updated: MediaAsset = JSON.parse(e.data);
            setAssets((prev) => prev.map((a) => (a.public_id === updated.public_id ? updated : a)));
            if (selectedIdRef.current === updated.public_id) {
              setSelectedAsset(updated);
            }
          } catch (err) {
            console.error('[SSE] Failed parsing asset:updated', err);
          }
        });

        es.addEventListener('asset:deleted', (e: MessageEvent) => {
          try {
            const { public_id } = JSON.parse(e.data);
            setAssets((prev) => {
              const next = prev.filter((a) => a.public_id !== public_id);
              if (selectedIdRef.current === public_id) {
                setSelectedAsset(next.length > 0 ? next[0] : null);
              }
              return next;
            });
            fetchPackages();
          } catch (err) {
            console.error('[SSE] Failed parsing asset:deleted', err);
          }
        });

        es.addEventListener('assets:deleted', (e: MessageEvent) => {
          try {
            const { public_ids } = JSON.parse(e.data);
            const idSet = new Set(public_ids);
            setAssets((prev) => {
              const next = prev.filter((a) => !idSet.has(a.public_id));
              if (selectedIdRef.current && idSet.has(selectedIdRef.current)) {
                setSelectedAsset(next.length > 0 ? next[0] : null);
              }
              return next;
            });
            fetchPackages();
          } catch (err) {
            console.error('[SSE] Failed parsing assets:deleted', err);
          }
        });

        es.addEventListener('package:updated', (e: MessageEvent) => {
          try {
            const updatedPkg: StoryPackage = JSON.parse(e.data);
            setPackages((prev) => {
              const exists = prev.some((p) => p.event_id === updatedPkg.event_id);
              if (exists) {
                return prev.map((p) => (p.event_id === updatedPkg.event_id ? updatedPkg : p));
              }
              return [updatedPkg, ...prev];
            });
          } catch (err) {
            console.error('[SSE] Failed parsing package:updated', err);
          }
        });

        es.addEventListener('package:deleted', (e: MessageEvent) => {
          try {
            const { event_id } = JSON.parse(e.data);
            setPackages((prev) => prev.filter((p) => p.event_id !== event_id));
          } catch (err) {
            console.error('[SSE] Failed parsing package:deleted', err);
          }
        });

        es.addEventListener('wire:cleared', () => {
          setAssets([]);
          setPackages([]);
          setSelectedAsset(null);
        });

        es.onerror = () => {
          setSseConnected(false);
        };
      } catch (err) {
        console.error('[SSE] Connection initialization failed', err);
        setSseConnected(false);
      }
    };

    connectSSE();

    return () => {
      if (es) es.close();
      if (liveToastTimerRef.current) clearTimeout(liveToastTimerRef.current);
    };
  }, []);

  const handleUploadSuccess = (newAsset: MediaAsset) => {
    setAssets((prev) => [newAsset, ...prev]);
    setSelectedAsset(newAsset);
  };

  const handleUpdateAsset = (updated: MediaAsset) => {
    setSelectedAsset(updated);
    setAssets((prev) =>
      prev.map((a) => {
        if (a.public_id === updated.public_id) {
          return updated;
        }
        if (updated.event_id && a.event_id === updated.event_id) {
          return {
            ...a,
            event_title: updated.event_title || a.event_title,
            cluster_radius_km: updated.cluster_radius_km || a.cluster_radius_km,
          };
        }
        return a;
      })
    );
    fetchQueue();
  };

  const handleDeleteSingle = async (public_id: string) => {
    try {
      const res = await fetch(`/api/v1/editorial/asset/${encodeURIComponent(public_id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAssets((prev) => {
          const remaining = prev.filter((a) => a.public_id !== public_id);
          if (selectedAsset?.public_id === public_id) {
            setSelectedAsset(remaining.length > 0 ? remaining[0] : null);
          }
          return remaining;
        });
      }
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  };

  const handleDeleteBatch = async (public_ids: string[]) => {
    try {
      const res = await fetch('/api/v1/editorial/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_ids }),
      });
      if (res.ok) {
        setAssets((prev) => {
          const remaining = prev.filter((a) => !public_ids.includes(a.public_id));
          if (selectedAsset && public_ids.includes(selectedAsset.public_id)) {
            setSelectedAsset(remaining.length > 0 ? remaining[0] : null);
          }
          return remaining;
        });
      }
    } catch (err) {
      console.error('Failed to batch delete assets:', err);
    }
  };

  const handleArchiveToggle = async (public_id: string, is_archived: boolean) => {
    try {
      const res = await fetch('/api/v1/editorial/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id, is_archived }),
      });
      if (res.ok) {
        const updated: MediaAsset = await res.json();
        setAssets((prev) => prev.map((a) => (a.public_id === public_id ? updated : a)));
        if (selectedAsset?.public_id === public_id) {
          setSelectedAsset(updated);
        }
      }
    } catch (err) {
      console.error('Failed to toggle archive:', err);
    }
  };

  const handleBatchArchive = async (public_ids: string[], is_archived: boolean) => {
    try {
      const res = await fetch('/api/v1/editorial/batch-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_ids, is_archived }),
      });
      if (res.ok) {
        setAssets((prev) =>
          prev.map((a) => (public_ids.includes(a.public_id) ? { ...a, is_archived } : a))
        );
        if (selectedAsset && public_ids.includes(selectedAsset.public_id)) {
          setSelectedAsset((prev) => (prev ? { ...prev, is_archived } : null));
        }
      }
    } catch (err) {
      console.error('Failed to batch archive:', err);
    }
  };

  const handleUpdateStatus = async (public_id: string, status: 'approved' | 'action_required') => {
    try {
      const target = assets.find((a) => a.public_id === public_id);
      if (!target) return;
      const bystanderCoordinates = target.faces.filter((f) => f.is_redacted).map((f) => [f.x, f.y, f.w, f.h]);
      const res = await fetch('/api/v1/editorial/redact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id,
          face_coordinates: bystanderCoordinates,
          review_status: status,
          headline: target.headline,
          incident_type: target.incident_type,
          urgency: target.urgency,
        }),
      });
      if (res.ok) {
        const updated: MediaAsset = await res.json();
        setAssets((prev) => prev.map((a) => (a.public_id === public_id ? updated : a)));
        if (selectedAsset?.public_id === public_id) {
          setSelectedAsset(updated);
        }
      }
    } catch (err) {
      console.error('Failed to update review status:', err);
    }
  };

  const handleSweepApproved = async () => {
    try {
      const res = await fetch('/api/v1/editorial/sweep-approved', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        const sweptIds: string[] = data.swept_ids || [];
        setAssets((prev) =>
          prev.map((a) => (sweptIds.includes(a.public_id) ? { ...a, is_archived: true } : a))
        );
        if (selectedAsset && sweptIds.includes(selectedAsset.public_id)) {
          setSelectedAsset((prev) => (prev ? { ...prev, is_archived: true } : null));
        }
      }
    } catch (err) {
      console.error('Failed to sweep approved assets:', err);
    }
  };

  const handleAssignPackage = async (public_id: string, event_id: string | null, event_title?: string | null) => {
    try {
      const matchedPkg = event_id ? packages.find((p) => p.event_id === event_id) : null;
      setAssets((prev) =>
        prev.map((a) => {
          if (a.public_id === public_id) {
            return {
              ...a,
              event_id: event_id || undefined,
              event_title: (matchedPkg ? matchedPkg.event_title : event_title) || undefined,
              incident_type: (matchedPkg && matchedPkg.incident_type) ? matchedPkg.incident_type : a.incident_type,
            };
          }
          return a;
        })
      );
      if (selectedAsset?.public_id === public_id) {
        setSelectedAsset((prev) =>
          prev
            ? {
                ...prev,
                event_id: event_id || undefined,
                event_title: (matchedPkg ? matchedPkg.event_title : event_title) || undefined,
                incident_type: (matchedPkg && matchedPkg.incident_type) ? matchedPkg.incident_type : prev.incident_type,
              }
            : null
        );
      }

      const res = await fetch('/api/v1/editorial/package/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id, event_id, event_title }),
      });
      if (res.ok) {
        const updatedAsset: MediaAsset = await res.json();
        setAssets((prev) => prev.map((a) => (a.public_id === public_id ? updatedAsset : a)));
        if (selectedAsset?.public_id === public_id) {
          setSelectedAsset(updatedAsset);
        }
        await Promise.all([fetchQueue(), fetchPackages()]);
      }
    } catch (err) {
      console.error('Failed to assign package:', err);
    }
  };

  const handleBatchAssignPackage = async (
    public_ids: string[],
    event_id: string | null,
    event_title?: string | null
  ) => {
    try {
      const matchedPkg = event_id ? packages.find((p) => p.event_id === event_id) : null;
      setAssets((prev) =>
        prev.map((a) => {
          if (public_ids.includes(a.public_id)) {
            return {
              ...a,
              event_id: event_id || undefined,
              event_title: (matchedPkg ? matchedPkg.event_title : event_title) || undefined,
              incident_type: (matchedPkg && matchedPkg.incident_type) ? matchedPkg.incident_type : a.incident_type,
            };
          }
          return a;
        })
      );
      if (selectedAsset && public_ids.includes(selectedAsset.public_id)) {
        setSelectedAsset((prev) =>
          prev
            ? {
                ...prev,
                event_id: event_id || undefined,
                event_title: (matchedPkg ? matchedPkg.event_title : event_title) || undefined,
                incident_type: (matchedPkg && matchedPkg.incident_type) ? matchedPkg.incident_type : prev.incident_type,
              }
            : null
        );
      }

      const res = await fetch('/api/v1/editorial/package/batch-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_ids, event_id, event_title }),
      });
      if (res.ok) {
        await Promise.all([fetchQueue(), fetchPackages()]);
      }
    } catch (err) {
      console.error('Failed to batch assign package:', err);
    }
  };

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackageId(packageId);
    const firstAsset = assets.find((a) => a.event_id === packageId);
    if (firstAsset) {
      setSelectedAsset(firstAsset);
      selectedIdRef.current = firstAsset.public_id;
    } else {
      setSelectedAsset(null);
      selectedIdRef.current = null;
    }
    setShowInspector(true);
  };

  const handleUpdatePackage = async (eventId: string, updates: {
    event_title?: string;
    incident_type?: string;
    cluster_radius_km?: number;
    package_window_hours?: number;
    package_status?: 'active' | 'concluded';
    lat?: number | null;
    lng?: number | null;
    clear_location?: boolean;
  }) => {
    try {
      setAssets((prev) =>
        prev.map((a) => (a.event_id === eventId ? { ...a, ...updates } : a))
      );
      if (selectedAsset?.event_id === eventId) {
        setSelectedAsset((prev) => (prev ? { ...prev, ...updates } : null));
      }
      setPackages((prev) =>
        prev.map((p) => {
          if (p.event_id !== eventId) return p;
          const updated = { ...p, ...updates };
          if (updates.clear_location) {
            updated.lat = null;
            updated.lng = null;
          }
          return updated;
        })
      );
      const res = await fetch('/api/v1/editorial/package/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, ...updates }),
      });
      if (res.ok) {
        await Promise.all([fetchQueue(), fetchPackages()]);
      } else {
        const errData = await res.json().catch(() => null);
        alert(errData?.detail || 'Failed to update package');
        await Promise.all([fetchQueue(), fetchPackages()]);
      }
    } catch (err) {
      console.error('Failed to update package:', err);
    }
  };

  const handleDisbandPackage = async (eventId: string) => {
    try {
      setAssets((prev) =>
        prev.map((a) => (a.event_id === eventId ? { ...a, event_id: undefined, event_title: undefined } : a))
      );
      if (selectedAsset?.event_id === eventId) {
        setSelectedAsset((prev) => (prev ? { ...prev, event_id: undefined, event_title: undefined } : null));
      }
      setPackages((prev) => prev.filter((p) => p.event_id !== eventId));
      setSelectedPackageId(null);
      const res = await fetch('/api/v1/editorial/package/disband', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });
      if (res.ok) {
        await Promise.all([fetchQueue(), fetchPackages()]);
      }
    } catch (err) {
      console.error('Failed to disband package:', err);
    }
  };

  const [isUploadingDirect, setIsUploadingDirect] = useState(false);
  const handleDirectUpload = async (
    files: FileList | File[],
    targetPackage?: { event_id: string; event_title?: string }
  ) => {
    setIsUploadingDirect(true);
    try {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        if (file.type.startsWith('video/') || /\.(mp4|mov|avi|wmv|flv|mkv|webm)$/i.test(file.name)) {
          alert('Video uploads are not supported. PressWire exclusively processes high-resolution photo journalism (JPEG, PNG, WebP, HEIC).');
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        // Clean human-readable headline from file basename (e.g., "market_st_crowd.jpg" -> "Market St Crowd")
        const baseName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]+/g, ' ')
          .trim();
        const formattedHeadline = baseName
          ? baseName.charAt(0).toUpperCase() + baseName.slice(1)
          : 'Wire Media Submission';

        formData.append('headline', formattedHeadline);
        formData.append('incident_type', 'uncategorized');
        formData.append('urgency', 'standard');

        const res = await fetch('/api/v1/intake/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const newAsset: MediaAsset = await res.json();
          setAssets((prev) => [newAsset, ...prev]);
          setSelectedAsset(newAsset);
          if (targetPackage?.event_id) {
            await handleAssignPackage(newAsset.public_id, targetPackage.event_id, targetPackage.event_title);
          }
        }
      }
      await Promise.all([fetchQueue(), fetchPackages()]);
    } catch (err) {
      console.error('Direct upload failed:', err);
    } finally {
      setIsUploadingDirect(false);
    }
  };

  // Live UTC Clock for global broadcast wire synchronization
  const [utcTime, setUtcTime] = useState(() => new Date().toUTCString().slice(17, 25));
  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Brand Landing Page Route (/)
  if (currentRoute === 'brand') {
    return <BrandHome onNavigate={(target) => navigateTo(target)} />;
  }

  // Standalone Public Mobile Route (/submit)
  if (currentRoute === 'submit') {
    return (
      <SubmitPortal
        onUploadSuccess={handleUploadSuccess}
        onNavigateDesk={() => navigateTo('desk')}
        onNavigateBrand={() => navigateTo('brand')}
      />
    );
  }

  // Editorial Control Desk View (/desk)
  return (
    <div className="h-screen bg-[#FBFBFC] text-slate-900 relative overflow-hidden flex flex-col font-sans">
      {/* Subtle ambient lighting */}
      <div className="absolute -top-32 -left-20 w-[550px] h-[550px] bg-gradient-to-tr from-slate-200/40 to-sky-200/30 rounded-full blur-[110px] pointer-events-none -z-10" />
      <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-slate-200/30 to-blue-200/20 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Seamless Edge-to-Edge Newsroom Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="w-full flex items-center justify-between">
          {/* Left: Brand Identity & Home Navigation */}
          <div className="flex items-center">
            <PressWireLogo
              size="md"
              variant="full"
              onClick={() => navigateTo('brand')}
            />
          </div>

          {/* Right: Live UTC Clock & Share Tip Line */}
          <div className="flex items-center space-x-3">
            {/* Live Newsroom UTC Clock (Clean text, no pill box) */}
            <div
              className="hidden sm:flex items-center space-x-1.5 text-xs font-mono text-slate-500 select-none"
              title={
                sseConnected
                  ? "Global Broadcast UTC Synchronization (Connected)"
                  : "Global Broadcast UTC Synchronization (Connecting...)"
              }
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{utcTime} UTC</span>
            </div>

            {/* Share Tip Line Link Icon Button (Clean, borderless, compact) */}
            <button
              onClick={handleCopyTipLink}
              title={tipLinkCopied ? 'Tip line link copied!' : 'Copy public tip line link'}
              aria-label="Copy public tip line link"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
            >
              {tipLinkCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Transient Real-Time Breaking Wire Notification Toast */}
      {liveToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-14 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700/80 animate-in fade-in slide-in-from-top-3 duration-200 cursor-pointer hover:bg-slate-800 transition-all max-w-sm"
          onClick={() => {
            const found = assets.find((a) => a.public_id === liveToast.public_id);
            if (found) {
              setSelectedAsset(found);
              selectedIdRef.current = found.public_id;
              setSelectedPackageId(null);
            }
            setLiveToast(null);
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Incoming Wire Dispatch
            </div>
            <div className="text-xs font-medium text-slate-100 truncate">
              {liveToast.headline}
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 hover:text-white px-1.5 py-0.5 rounded border border-slate-700">
            VIEW
          </span>
        </div>
      )}

      {/* Main Studio Cockpit Workspace (Edge-to-Edge Full Bleed) */}
      <main className="flex-1 w-full p-3.5 flex flex-col min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)] lg:grid-rows-1 gap-3.5 items-stretch flex-1 min-h-0 w-full h-full overflow-hidden">
          {/* Zone 1: Inbound Wire Stream */}
          <div className="w-full min-w-0 flex flex-col h-full min-h-0 overflow-hidden">
            <WireQueue
              assets={assets}
              packages={packages}
              selectedId={selectedAsset?.public_id || null}
              selectedPackageId={selectedPackageId}
              onSelect={(a) => {
                setSelectedAsset(a);
                selectedIdRef.current = a.public_id;
                setSelectedPackageId(null);
              }}
              onSelectPackage={handleSelectPackage}
              onDeleteSingle={handleDeleteSingle}
              onDeleteBatch={handleDeleteBatch}
              onArchiveToggle={handleArchiveToggle}
              onBatchArchive={handleBatchArchive}
              onSweepApproved={handleSweepApproved}
              onDirectUpload={handleDirectUpload}
              isUploading={isUploadingDirect}
              onUpdateStatus={handleUpdateStatus}
              onAssignPackage={handleAssignPackage}
              onBatchAssignPackage={handleBatchAssignPackage}
              onRefreshQueue={fetchQueue}
            />
          </div>

          {/* Zone 2: Active Saliency & Redaction Canvas (Expansive Full Workbench) */}
          <div className="w-full min-w-0 flex flex-col h-full min-h-0 overflow-hidden">
            {selectedAsset ? (
              <RedactionCanvas
                asset={selectedAsset}
                allAssets={assets}
                onSelectAsset={(a) => {
                  setSelectedAsset(a);
                  selectedIdRef.current = a.public_id;
                }}
                onUpdateSuccess={handleUpdateAsset}
                onDeleteAsset={handleDeleteSingle}
                onToggleInspector={() => setShowInspector((prev) => !prev)}
                isInspectorOpen={showInspector}
              />
            ) : assets.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                  if (!isDragOverCenter) setIsDragOverCenter(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setIsDragOverCenter(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragOverCenter(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleDirectUpload(e.dataTransfer.files);
                  }
                }}
                className={`border rounded-2xl p-12 flex flex-col items-center justify-center flex-1 text-center transition-all duration-200 select-none relative ${
                  isDragOverCenter
                    ? 'border-blue-500 bg-blue-50/40 shadow-xs ring-2 ring-blue-400/20'
                    : 'bg-white border-slate-200/80 shadow-2xs hover:border-slate-300'
                }`}
              >
                {/* Minimalist Newsroom Media Vector Illustration */}
                <div className="relative mb-5">
                  <svg
                    className={`w-32 h-28 transition-transform duration-300 ${
                      isDragOverCenter ? 'scale-110' : 'hover:scale-105'
                    }`}
                    viewBox="0 0 140 110"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Background angled card */}
                    <rect
                      x="32"
                      y="14"
                      width="76"
                      height="54"
                      rx="8"
                      fill="#f8fafc"
                      stroke="#e2e8f0"
                      strokeWidth="1.5"
                      transform="rotate(-5 32 14)"
                    />
                    {/* Foreground card */}
                    <rect
                      x="26"
                      y="26"
                      width="88"
                      height="62"
                      rx="8"
                      fill="#ffffff"
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                    />
                    {/* Viewfinder frame */}
                    <rect
                      x="34"
                      y="34"
                      width="72"
                      height="46"
                      rx="5"
                      fill="#f8fafc"
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    {/* Subtle focus corners (editorial camera motif) */}
                    <path
                      d="M38 42v-4h4 M102 42v-4h-4 M38 72v4h4 M102 72v4h-4"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Center aperture / media symbol */}
                    <circle cx="70" cy="57" r="11" stroke="#94a3b8" strokeWidth="1.5" />
                    <circle cx="70" cy="57" r="4.5" fill="#94a3b8" />
                    <path d="M63 47h14" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />

                    {/* Small accent upload badge */}
                    <circle cx="114" cy="30" r="11" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.5" />
                    <path
                      d="M114 34V26M111 29l3-3 3 3"
                      stroke="#2563eb"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Minimal & Concise Typography */}
                <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
                  {isDragOverCenter ? 'Release files to import' : 'Wire queue is empty'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                  Drop breaking photo dispatches here, or browse from your computer.
                </p>

                {/* Single Concise Button */}
                <button
                  type="button"
                  onClick={() => centralFileInputRef.current?.click()}
                  disabled={isUploadingDirect}
                  className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center space-x-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isUploadingDirect ? 'Importing...' : 'Browse files'}</span>
                </button>

                <input
                  type="file"
                  ref={centralFileInputRef}
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleDirectUpload(e.target.files);
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center text-slate-400 space-y-2 shadow-sm flex flex-col items-center justify-center flex-1">
                <p className="text-sm font-semibold text-slate-700">NO ACTIVE MEDIA BUFFER SELECTED</p>
                <p className="text-xs text-slate-400">
                  Select an item from the Inbound Wire Buffer to begin triage.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Slide-Over Inspector Drawer for Provenance & Export Deliverables */}
      {(selectedPackageId || selectedAsset) && (
        <>
          {/* Subtle click-outside backdrop when drawer is open */}
          <div
            onClick={() => {
              setShowInspector(false);
              setSelectedPackageId(null);
            }}
            className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300 ${
              showInspector ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Slide-over Drawer Panel */}
          <aside
            className={`fixed inset-y-0 right-0 z-50 w-full max-w-[460px] bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
              showInspector ? 'translate-x-0' : 'translate-x-full pointer-events-none'
            }`}
          >
            {selectedPackageId ? (
              (() => {
                const pkgAssets = assets.filter((a) => a.event_id === selectedPackageId);
                const leadAsset = pkgAssets[0];
                const matchedPkg = packages.find((p) => p.event_id === selectedPackageId);
                return (
                  <PackageInspector
                    packageId={selectedPackageId}
                    packageTitle={matchedPkg?.event_title || leadAsset?.event_title || 'Untitled Package'}
                    incidentType={matchedPkg?.incident_type || leadAsset?.incident_type || 'uncategorized'}
                    clusterRadiusKm={matchedPkg?.cluster_radius_km ?? leadAsset?.cluster_radius_km ?? 1.5}
                    packageWindowHours={matchedPkg?.package_window_hours ?? leadAsset?.package_window_hours ?? 1.0}
                    packageStatus={matchedPkg?.package_status ?? leadAsset?.package_status ?? 'active'}
                    lat={matchedPkg?.lat ?? leadAsset?.telemetry?.gps_latitude ?? null}
                    lng={matchedPkg?.lng ?? leadAsset?.telemetry?.gps_longitude ?? null}
                    assets={pkgAssets}
                    onUpdatePackage={handleUpdatePackage}
                    onDisbandPackage={handleDisbandPackage}
                    onDetachAsset={async (publicId) => {
                      await handleAssignPackage(publicId, null);
                    }}
                    onSelectAsset={(asset) => {
                      setSelectedAsset(asset);
                      selectedIdRef.current = asset.public_id;
                      setSelectedPackageId(null);
                    }}
                    onClose={() => {
                      setShowInspector(false);
                      setSelectedPackageId(null);
                    }}
                  />
                );
              })()
            ) : selectedAsset ? (
              <ProvenanceCard
                asset={selectedAsset}
                allAssets={assets}
                packages={packages}
                onAssignPackage={handleAssignPackage}
                onUpdateAsset={handleUpdateAsset}
                onClose={() => setShowInspector(false)}
              />
            ) : null}
          </aside>
        </>
      )}
    </div>
  );
}
export default App;
