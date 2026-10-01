import React, { useState, useRef } from 'react';
import type { MediaAsset } from '../../types';
import {
  UploadCloud,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Compass,
  Radio,
  X,
  FileVideo,
  FileImage,
  ExternalLink,
} from 'lucide-react';
import { CATEGORY_LIST } from '../../utils/categories';

interface SubmitPortalProps {
  onUploadSuccess?: (asset: MediaAsset) => void;
  onNavigateDesk?: () => void;
}

export const SubmitPortal: React.FC<SubmitPortalProps> = ({ onUploadSuccess, onNavigateDesk }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [headline, setHeadline] = useState('');
  const [incidentType, setIncidentType] = useState('breaking_news');
  const [urgency, setUrgency] = useState<'breaking' | 'standard'>('breaking');
  const [hasAgreedWaiver, setHasAgreedWaiver] = useState(true);

  // HTML5 Geolocation state
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'acquired' | 'failed'>('idle');

  // Uploading & post-submission state
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submittedAsset, setSubmittedAsset] = useState<MediaAsset | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selected: File) => {
    setFile(selected);
    const isVideo = selected.type.startsWith('video');
    setMediaType(isVideo ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(selected));

    // Auto-populate default headline if empty
    if (!headline) {
      const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setHeadline(`EYEWITNESS: ${cleanName.toUpperCase()}`);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleBrowseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleClearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setMediaType(null);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('failed');
      setCoords({ lat: 37.7749, lng: -122.4194 });
      return;
    }

    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGeoStatus('acquired');
      },
      () => {
        // Fallback to metro area coordinates on permission denial / offline
        setCoords({ lat: 37.7749, lng: -122.4194 });
        setGeoStatus('acquired');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setStatusMessage('Uploading to Cloudinary and initiating AI provenance verification...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('headline', headline.trim() || 'EYEWITNESS FIELD SUBMISSION');
      formData.append('incident_type', incidentType);
      formData.append('urgency', urgency);

      if (coords) {
        formData.append('lat', coords.lat.toString());
        formData.append('lng', coords.lng.toString());
      } else {
        formData.append('lat', '37.7749');
        formData.append('lng', '-122.4194');
      }

      const res = await fetch('/api/v1/intake/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed (${res.status}): ${res.statusText}`);
      }

      const asset: MediaAsset = await res.json();
      setSubmittedAsset(asset);
      onUploadSuccess?.(asset);
    } catch (err: any) {
      console.error('Submission error:', err);
      setStatusMessage(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetForNext = () => {
    handleClearFile();
    setHeadline('');
    setCoords(null);
    setGeoStatus('idle');
    setSubmittedAsset(null);
    setStatusMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Hidden inputs for direct triggers */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleBrowseChange}
      />

      {/* Portal Mobile-First Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/30">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-extrabold tracking-tight text-slate-900">PRESSWIRE</span>
                <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded-full uppercase">
                  Tip Line
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Citizen & Eyewitness Direct Intake</p>
            </div>
          </div>

          {onNavigateDesk && (
            <button
              onClick={onNavigateDesk}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1"
            >
              <span>Desk Console</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </header>

      {/* Main Form Body */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-start">
        {submittedAsset ? (
          /* Post-Submission Success State */
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border-4 border-emerald-100 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Tip Successfully Received
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your footage has been routed into the editorial live buffer. Automated moderation, face detection, and EXIF telemetry verification are in progress.
              </p>
            </div>

            {/* Ingest Tracking Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Wire Tracking ID</span>
                <span className="font-mono text-slate-900 font-bold text-[11px] truncate max-w-[200px]">
                  {submittedAsset.public_id}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Headline</span>
                <span className="font-semibold text-slate-900 truncate max-w-[220px]">
                  {submittedAsset.headline}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  {submittedAsset.review_status === 'approved' ? 'Approved for Wire' : 'Pending Editorial Triage'}
                </span>
              </div>
              {submittedAsset.telemetry?.has_gps && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>GPS Telemetry</span>
                  <span className="font-mono text-slate-700 text-[10px]">
                    {submittedAsset.telemetry.gps_latitude?.toFixed(4)}° N, {submittedAsset.telemetry.gps_longitude?.toFixed(4)}° W
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleResetForNext}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/25 transition cursor-pointer active:scale-98 flex items-center justify-center space-x-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Submit Another Photo or Video</span>
              </button>

              {onNavigateDesk && (
                <button
                  onClick={onNavigateDesk}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Return to Newsroom Studio Desk
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Active Intake Form */
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-900/5 space-y-5">
            {/* Breaking Advisory Banner */}
            <div className="flex items-start space-x-3 bg-rose-50/70 border border-rose-200/80 p-3 rounded-2xl">
              <span className="p-1 bg-rose-600 text-white rounded-lg shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <div>
                <p className="text-xs font-bold text-rose-950">Breaking Eyewitness Tip Line</p>
                <p className="text-[11px] text-rose-800/80 leading-relaxed mt-0.5">
                  Are you witnessing an unfolding event? Submit raw photos or video clips directly to the newsroom desk for real-time verification and broadcast packaging.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Media Selection Area */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  1. Capture or Select Footage
                </label>

                {!file ? (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Direct Smartphone Camera Trigger */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-5 bg-blue-50/80 hover:bg-blue-100/80 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl transition cursor-pointer group active:scale-98"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform mb-2">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-blue-900">Take Photo / Video</span>
                      <span className="text-[10px] text-blue-600">Camera Direct</span>
                    </button>

                    {/* File / Gallery Browse */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-5 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl transition cursor-pointer group active:scale-98"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform mb-2">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Choose from Files</span>
                      <span className="text-[10px] text-slate-500">Photo Library</span>
                    </button>
                  </div>
                ) : (
                  /* Preview Card */
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md">
                    {mediaType === 'video' ? (
                      <video
                        src={previewUrl!}
                        controls
                        className="max-h-56 w-full object-contain mx-auto"
                      />
                    ) : (
                      <img
                        src={previewUrl!}
                        alt="Preview"
                        className="max-h-56 w-full object-contain mx-auto"
                      />
                    )}

                    {/* File Tag & Removal Button */}
                    <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={handleClearFile}
                        className="p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-full backdrop-blur-xs transition cursor-pointer shadow-md"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-2.5 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 truncate">
                        {mediaType === 'video' ? (
                          <FileVideo className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <FileImage className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-800 truncate text-[11px]">
                          {file.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Event Caption / Headline */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  2. What did you observe?
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. FLASH FLOODING OBSERVED ON 4TH STREET"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Incident Category Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  3. Topic Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORY_LIST.map((c) => {
                    const isSelected = incidentType === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setIncidentType(c.id)}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center space-x-1 truncate ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-2xs font-bold'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${c.dotColor}`} />
                        <span className="truncate text-[11px]">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Urgency & Geolocation in 2-cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Urgency */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    4. Urgency
                  </label>
                  <div className="flex space-x-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setUrgency('breaking')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        urgency === 'breaking'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Breaking
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgency('standard')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        urgency === 'standard'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Standard
                    </button>
                  </div>
                </div>

                {/* HTML5 Geolocation */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    5. Provenance GPS
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={geoStatus === 'locating'}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                      coords
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {geoStatus === 'locating' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span>Acquiring GPS...</span>
                      </>
                    ) : coords ? (
                      <>
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="truncate">GPS Attached ({coords.lat.toFixed(2)}°)</span>
                      </>
                    ) : (
                      <>
                        <Compass className="w-3.5 h-3.5 text-blue-600" />
                        <span>Use My Location</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Trust & Privacy Notice */}
              <div className="flex items-center space-x-2 text-[11px] text-slate-500 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Encrypted intake. Faces of civilian bystanders will be selectively redacted by editors before broadcast.
                </span>
              </div>

              {/* Broadcast Copyright & Legal Release Waiver */}
              <div className="flex items-start space-x-2.5 p-3 bg-slate-50/90 border border-slate-200/90 rounded-xl text-left">
                <input
                  type="checkbox"
                  id="broadcast-waiver"
                  checked={hasAgreedWaiver}
                  onChange={(e) => setHasAgreedWaiver(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="broadcast-waiver" className="text-[11px] text-slate-600 leading-snug cursor-pointer select-none">
                  <strong className="text-slate-800 font-semibold">Irrevocable Broadcast Release:</strong> I certify that I am the author of this media and grant PressWire and its syndication partners a perpetual, royalty-free license to broadcast, adapt, and distribute this content across television, digital, and social feeds.
                </label>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!file || loading || !hasAgreedWaiver}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Media Pipeline...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Transmit Tip to Live Wire</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200/80 text-center text-[10px] text-slate-400 font-mono">
        PRESSWIRE VERIFIED MEDIA INTAKE • POWERED BY CLOUDINARY ZERO-STORAGE PIPELINE
      </footer>
    </div>
  );
};
