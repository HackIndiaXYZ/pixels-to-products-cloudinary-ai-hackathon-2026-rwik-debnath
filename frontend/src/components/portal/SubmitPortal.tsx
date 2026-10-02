import React, { useState, useRef } from 'react';
import type { MediaAsset } from '../../types';
import {
  UploadCloud,
  Camera,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  X,
  FileVideo,
  FileImage,
  Lock,
} from 'lucide-react';
import { PressWireLogo } from '../brand/PressWireLogo';
import { CATEGORY_LIST } from '../../utils/categories';

interface SubmitPortalProps {
  onUploadSuccess?: (asset: MediaAsset) => void;
  onNavigateDesk?: () => void;
  onNavigateBrand?: () => void;
}

export const SubmitPortal: React.FC<SubmitPortalProps> = ({
  onUploadSuccess,
  onNavigateBrand,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [headline, setHeadline] = useState('');
  const [incidentType, setIncidentType] = useState('public_safety');
  const [urgency, setUrgency] = useState<'breaking' | 'standard'>('breaking');
  const [hasAgreedWaiver, setHasAgreedWaiver] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

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

    // Auto-populate clean headline if empty
    if (!headline) {
      const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setHeadline(`Eyewitness dispatch: ${cleanName}`);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setMediaType(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setStatusMessage('Uploading footage and processing AI provenance verification...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('headline', headline.trim() || 'EYEWITNESS FIELD SUBMISSION');
      formData.append('incident_type', incidentType);
      formData.append('urgency', urgency);
      formData.append('waiver_signed', hasAgreedWaiver ? 'true' : 'false');

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
    setSubmittedAsset(null);
    setStatusMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Hidden file inputs */}
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

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <PressWireLogo
            size="md"
            variant="full"
            onClick={onNavigateBrand}
          />
        </div>
      </header>

      {/* Main Intake Workspace */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-start">
        {submittedAsset ? (
          /* Post-Submission Success State */
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-6 my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Submission Received
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Your footage has been securely routed to the newsroom desk for verification and broadcast packaging.
              </p>
            </div>

            {/* Ingest Tracking Manifest */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left space-y-2.5 text-xs font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Tracking ID
                </span>
                <span className="font-mono text-slate-900 font-bold text-[11px] truncate max-w-[200px]">
                  {submittedAsset.public_id}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-[11px]">Headline</span>
                <span className="font-semibold text-slate-900 truncate max-w-[220px] text-[11px]">
                  {submittedAsset.headline}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-[11px]">Status</span>
                <span className="font-mono text-slate-900 font-bold text-[10px] uppercase bg-slate-200/80 px-2 py-0.5 rounded">
                  {submittedAsset.review_status || submittedAsset.moderation?.status || 'Queued for Review'}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleResetForNext}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.99]"
              >
                <Camera className="w-4 h-4" />
                <span>Submit Another Dispatch</span>
              </button>

              {onNavigateBrand && (
                <button
                  onClick={onNavigateBrand}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Return to Home
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Clean, Minimal & Powerful Intake Card */
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Header Block */}
            <div className="border-b border-slate-100 pb-4 mb-5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Submit Eyewitness Footage
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Secure media intake for the PressWire newsroom desk.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Media Dropzone */}
              <div>
                {!file ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                      isDragging
                        ? 'border-slate-900 bg-slate-100/80 scale-[1.01]'
                        : 'border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/80 mx-auto mb-2.5">
                      <UploadCloud className="w-5 h-5 text-slate-600" />
                    </div>

                    <p className="text-xs font-bold text-slate-900">
                      Drag & drop footage here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      MP4, MOV, JPG, PNG, HEIC (Up to 500MB)
                    </p>

                    <div className="flex items-center justify-center gap-2 mt-3.5">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-2xs active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5 text-slate-600" />
                        <span>Camera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-2xs active:scale-95"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                        <span>Browse Files</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Cinematic Preview Card */
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
                    {mediaType === 'video' ? (
                      <video
                        src={previewUrl!}
                        controls
                        className="max-h-60 w-full object-contain mx-auto"
                      />
                    ) : (
                      <img
                        src={previewUrl!}
                        alt="Preview"
                        className="max-h-60 w-full object-contain mx-auto"
                      />
                    )}

                    {/* Clear Button */}
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="absolute top-2.5 right-2.5 p-1.5 bg-black/80 hover:bg-rose-600 text-white rounded-lg backdrop-blur-md transition cursor-pointer shadow-md"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 truncate">
                        {mediaType === 'video' ? (
                          <FileVideo className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <FileImage className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="font-medium text-slate-200 truncate text-[11px]">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] font-mono text-slate-400">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        <span className="font-mono text-[9px] font-bold uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                          {mediaType}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Headline */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Flash flooding observed at 4th & Mission"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORY_LIST.map((c) => {
                    const isSelected = incidentType === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setIncidentType(c.id)}
                        className={`py-2 px-2.5 rounded-xl text-xs transition cursor-pointer flex items-center space-x-2 truncate border ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-300 text-blue-900 font-semibold shadow-2xs'
                            : 'bg-slate-50/60 hover:bg-slate-100/70 border-slate-200/80 text-slate-700 font-medium'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dotColor}`} />
                        <span className="truncate text-[11px]">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Urgency
                </label>
                <div className="flex bg-slate-100/90 border border-slate-200/80 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setUrgency('breaking')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                      urgency === 'breaking'
                        ? 'bg-white text-rose-700 border border-rose-200/80 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>Breaking Scoop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgency('standard')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                      urgency === 'standard'
                        ? 'bg-white text-slate-800 border border-slate-200/80 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Standard Wire</span>
                  </button>
                </div>
              </div>

              {/* Legal & Privacy */}
              <div className="space-y-2 pt-1">
                <div className="flex items-start space-x-2.5 p-3 bg-slate-50 border border-slate-200/90 rounded-xl text-left">
                  <input
                    type="checkbox"
                    id="broadcast-waiver"
                    checked={hasAgreedWaiver}
                    onChange={(e) => setHasAgreedWaiver(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer accent-slate-900"
                  />
                  <label
                    htmlFor="broadcast-waiver"
                    className="text-[11px] text-slate-600 leading-snug cursor-pointer select-none"
                  >
                    <strong className="text-slate-900 font-semibold">Broadcast Release:</strong> I certify ownership and grant PressWire permission to broadcast and distribute this media.
                  </label>
                </div>

                <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono text-slate-400 py-0.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Encrypted intake • Civilian faces automatically redacted</span>
                </div>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!file || loading || !hasAgreedWaiver}
                className={`w-full py-3 font-semibold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed ${
                  urgency === 'breaking'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/15'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/15'
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Submit Footage</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 font-sans">
        PressWire Newsroom Intake
      </footer>
    </div>
  );
};
