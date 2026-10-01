import { useState, useEffect, useRef } from 'react';
import type { MediaAsset } from './types';
import { WireQueue } from './components/desk/WireQueue';
import { ProvenanceCard } from './components/desk/ProvenanceCard';
import { RedactionCanvas } from './components/desk/RedactionCanvas';
import { SubmitPortal } from './components/portal/SubmitPortal';
import { BrandHome } from './components/brand/BrandHome';
import { Clock, Share2, Check } from 'lucide-react';
import { PressWireLogo } from './components/brand/PressWireLogo';

export function App() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [tipLinkCopied, setTipLinkCopied] = useState(false);

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
                  prev.incident_type !== matching.incident_type
                ) {
                  return matching;
                }
                return prev;
              });
            }
          } else {
            setSelectedAsset(data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching wire queue:', err);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => fetchQueue(), 10000);
    return () => clearInterval(interval);
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

  const [isUploadingDirect, setIsUploadingDirect] = useState(false);
  const handleDirectUpload = async (files: FileList | File[]) => {
    setIsUploadingDirect(true);
    try {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('headline', `EYEWITNESS INGEST: ${file.name.replace(/\.[^/.]+$/, '').toUpperCase()}`);
        formData.append('incident_type', 'uncategorized');
        formData.append('urgency', 'standard');
        formData.append('lat', '37.7749');
        formData.append('lng', '-122.4194');

        const res = await fetch('/api/v1/intake/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const newAsset: MediaAsset = await res.json();
          setAssets((prev) => [newAsset, ...prev]);
          setSelectedAsset(newAsset);
        }
      }
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

          {/* Right: Live UTC Clock, Share Tip Line & Direct Ingest */}
          <div className="flex items-center space-x-2">
            {/* Live Newsroom UTC Clock */}
            <div
              className="hidden sm:flex items-center space-x-1.5 text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200/70 px-2.5 py-1.5 rounded-lg"
              title="Global Broadcast UTC Synchronization"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{utcTime} UTC</span>
            </div>

            {/* Share Tip Line Link Icon Button */}
            <button
              onClick={handleCopyTipLink}
              title={tipLinkCopied ? 'Tip line link copied!' : 'Copy public tip line link'}
              aria-label="Copy public tip line link"
              className="p-1.5 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-2xs transition-all flex items-center justify-center cursor-pointer active:scale-95"
            >
              {tipLinkCopied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Cockpit Workspace (Edge-to-Edge Full Bleed) */}
      <main className="flex-1 w-full p-3.5 flex flex-col min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)] lg:grid-rows-1 gap-3.5 items-stretch flex-1 min-h-0 w-full h-full overflow-hidden">
          {/* Zone 1: Inbound Wire Stream */}
          <div className="w-full min-w-0 flex flex-col h-full min-h-0 overflow-hidden">
            <WireQueue
              assets={assets}
              selectedId={selectedAsset?.public_id || null}
              onSelect={(a) => {
                setSelectedAsset(a);
                selectedIdRef.current = a.public_id;
              }}
              onDeleteSingle={handleDeleteSingle}
              onDeleteBatch={handleDeleteBatch}
              onArchiveToggle={handleArchiveToggle}
              onBatchArchive={handleBatchArchive}
              onSweepApproved={handleSweepApproved}
              onDirectUpload={handleDirectUpload}
              isUploading={isUploadingDirect}
              onUpdateStatus={handleUpdateStatus}
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
      {selectedAsset && (
        <>
          {/* Subtle click-outside backdrop when drawer is open */}
          <div
            onClick={() => setShowInspector(false)}
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
            <ProvenanceCard
              asset={selectedAsset}
              onUpdateAsset={handleUpdateAsset}
              onClose={() => setShowInspector(false)}
            />
          </aside>
        </>
      )}
    </div>
  );
}
export default App;
