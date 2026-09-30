import { useState, useEffect, useRef } from 'react';
import type { MediaAsset } from './types';
import { PublicIntake } from './components/intake/PublicIntake';
import { WireQueue } from './components/desk/WireQueue';
import { ProvenanceCard } from './components/desk/ProvenanceCard';
import { RedactionCanvas } from './components/desk/RedactionCanvas';
import { SubmitPortal } from './components/portal/SubmitPortal';
import { Radio, UploadCloud, X, Clock, Smartphone } from 'lucide-react';

export function App() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTipLineModal, setShowTipLineModal] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

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

  // Client-side URL route detection (/submit vs /desk)
  const [currentRoute, setCurrentRoute] = useState<'desk' | 'submit'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/submit' || path === '/submit/') return 'submit';
    }
    return 'desk';
  });

  const navigateTo = (route: 'desk' | 'submit') => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      const targetPath = route === 'submit' ? '/submit' : '/desk';
      window.history.pushState({ route }, '', targetPath);
    }
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      setCurrentRoute(path === '/submit' || path === '/submit/' ? 'submit' : 'desk');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keep a ref to the currently selected public_id to preserve selection across periodic background polls
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedAsset?.public_id || null;
  }, [selectedAsset]);

  const fetchQueue = async (manual = false) => {
    if (manual) setIsRefreshing(true);
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
                  prev.is_archived !== matching.is_archived
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
    } finally {
      if (manual) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  useEffect(() => {
    fetchQueue(false);
    const interval = setInterval(() => fetchQueue(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUploadSuccess = (newAsset: MediaAsset) => {
    setAssets((prev) => [newAsset, ...prev]);
    setSelectedAsset(newAsset);
    setShowTipLineModal(false);
  };

  const handleUpdateAsset = (updated: MediaAsset) => {
    setSelectedAsset(updated);
    setAssets((prev) => prev.map((a) => (a.public_id === updated.public_id ? updated : a)));
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

  // Standalone Public Mobile Route (/submit)
  if (currentRoute === 'submit') {
    return (
      <SubmitPortal
        onUploadSuccess={handleUploadSuccess}
        onNavigateDesk={() => navigateTo('desk')}
      />
    );
  }

  // Editorial Control Desk View (/desk or default)
  return (
    <div className="min-h-screen lg:h-screen bg-[#FBFBFC] text-slate-900 relative overflow-hidden flex flex-col font-sans">
      {/* Billow ambient glowing background orbs */}
      <div className="absolute -top-32 -left-20 w-[550px] h-[550px] bg-gradient-to-tr from-sky-300/35 to-blue-500/25 rounded-full blur-[110px] pointer-events-none -z-10" />
      <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-400/25 to-indigo-400/20 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Seamless Edge-to-Edge Newsroom Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="w-full flex items-center justify-between">
          {/* Left: Brand Identity */}
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/25">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">PRESSWIRE</span>
          </div>

          {/* Center Navigation: Studio Desk vs Standalone Tip Line Portal */}
          <div className="flex items-center space-x-1 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/60 shadow-2xs text-xs font-semibold">
            <button
              onClick={() => navigateTo('desk')}
              className="px-3 py-1 rounded-lg transition cursor-pointer flex items-center space-x-1.5 bg-white text-slate-900 shadow-2xs font-bold"
            >
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              <span>Editorial Desk</span>
            </button>
            <button
              onClick={() => navigateTo('submit')}
              className="px-3 py-1 rounded-lg transition cursor-pointer flex items-center space-x-1.5 text-slate-500 hover:text-slate-900"
            >
              <Smartphone className="w-3.5 h-3.5 text-rose-600" />
              <span>Public Tip Line</span>
              <span className="text-[9px] font-mono bg-rose-50 text-rose-700 px-1 py-0.2 rounded border border-rose-200/60">
                /submit
              </span>
            </button>
          </div>

          {/* Right: Live UTC Clock & Quick Submit Button */}
          <div className="flex items-center space-x-3">
            {/* Live Newsroom UTC Clock */}
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{utcTime} UTC</span>
            </div>

            {/* Clean Submit Media modal trigger */}
            <button
              onClick={() => setShowTipLineModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs shadow-blue-500/25 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Submit Media</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Cockpit Workspace (Edge-to-Edge Full Bleed) */}
      <main className="flex-1 w-full p-4 flex flex-col min-h-0 lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)] gap-4 items-stretch flex-1 min-h-0 w-full">
          {/* Zone 1: Inbound Wire Stream */}
          <div className="w-full min-w-0 flex flex-col h-full">
            <WireQueue
              assets={assets}
              selectedId={selectedAsset?.public_id || null}
              onSelect={(a) => {
                setSelectedAsset(a);
                selectedIdRef.current = a.public_id;
              }}
              onRefresh={() => fetchQueue(true)}
              isRefreshing={isRefreshing}
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
          <div className="w-full min-w-0 flex flex-col h-full">
            {selectedAsset ? (
              <RedactionCanvas
                asset={selectedAsset}
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



      {/* Public Tip Line Slide-Over / Modal */}
      {showTipLineModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Citizen & Field Reporter Intake Portal
                </span>
                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Route: /submit
                </span>
              </div>
              <button
                onClick={() => setShowTipLineModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <PublicIntake onUploadSuccess={handleUploadSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
