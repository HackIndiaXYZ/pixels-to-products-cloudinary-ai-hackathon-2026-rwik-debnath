import React, { useState } from 'react';
import type { MediaAsset } from '../../types';
import { UploadCloud, Compass, ArrowRight } from 'lucide-react';
import { getStoredCategories } from '../../utils/categories';

interface PublicIntakeProps {
  onUploadSuccess: (asset: MediaAsset) => void;
}

export const PublicIntake: React.FC<PublicIntakeProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [headline, setHeadline] = useState('EYEWITNESS REPORT: INCIDENT NEAR CIVIC CENTER');
  const [incidentType, setIncidentType] = useState('public_safety');
  const [urgency, setUrgency] = useState<'breaking' | 'standard'>('breaking');
  const [useGps, setUseGps] = useState(true);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasAgreedWaiver, setHasAgreedWaiver] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type.startsWith('video') || /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(selected.name)) {
        setStatusMessage('Video uploads are not supported. PressWire Wire Intake exclusively accepts high-resolution photo journalism (JPEG, PNG, WebP, HEIC).');
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setStatusMessage('Initiating Cloudinary upload, automated moderation & face coordinate extraction...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('headline', headline);
      formData.append('incident_type', incidentType);
      formData.append('urgency', urgency);
      formData.append('waiver_signed', hasAgreedWaiver ? 'true' : 'false');

      if (useGps) {
        formData.append('lat', '37.7793');
        formData.append('lng', '-122.4192');
      }

      const res = await fetch('/api/v1/intake/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      const data: MediaAsset = await res.json();
      setStatusMessage('Ingestion complete! Routed to editorial desk.');
      onUploadSuccess(data);
      setFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      setStatusMessage(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white border border-slate-200/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Citizen & Field Media Intake</span>
            <span className="text-xs text-emerald-600 font-semibold">
              Live Gateway
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Direct Cloudinary Ingestion • Automated Safety Filtering • EXIF Telemetry Extraction
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Upload Wire Photo (JPEG, PNG, WebP, HEIC)
          </label>
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/30 relative group">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {previewUrl ? (
              <div className="space-y-3">
                <img src={previewUrl} alt="Preview" className="max-h-52 mx-auto rounded-xl shadow-md object-contain border border-slate-200" />
                <p className="text-xs text-slate-500 font-medium">{file?.name} ({file ? (file.size / (1024 * 1024)).toFixed(2) : 0} MB)</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-800 font-semibold">Click to select files or drag and drop</p>
                <p className="text-xs text-slate-400">High-resolution photos, smartphone captures, DSLR dispatches</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Event Headline / Caption
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            placeholder="e.g. FLASH FLOODING OBSERVED ON MAIN AVE"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Incident Category
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {getStoredCategories().map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Urgency Classification
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setUrgency('breaking')}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl uppercase tracking-wider transition ${
                  urgency === 'breaking'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Breaking
              </button>
              <button
                type="button"
                onClick={() => setUrgency('standard')}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl uppercase tracking-wider transition ${
                  urgency === 'standard'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Standard
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            id="gps-toggle"
            checked={useGps}
            onChange={(e) => setUseGps(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
          />
          <label htmlFor="gps-toggle" className="text-xs text-slate-700 flex items-center space-x-2 cursor-pointer font-medium">
            <Compass className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Simulate Sensor Geolocation Telemetry (Provenance Map Plotting)</span>
          </label>
        </div>

        <div className="flex items-start space-x-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            id="modal-broadcast-waiver"
            checked={hasAgreedWaiver}
            onChange={(e) => setHasAgreedWaiver(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
          />
          <label htmlFor="modal-broadcast-waiver" className="text-[11px] text-slate-600 leading-snug cursor-pointer select-none">
            <strong className="text-slate-800 font-semibold">Broadcast Rights Release:</strong> I certify ownership and grant PressWire an irrevocable license to broadcast and distribute this footage across linear and digital feeds.
          </label>
        </div>

        {statusMessage && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
            {statusMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={!file || loading || !hasAgreedWaiver}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 active:scale-98 cursor-pointer"
        >
          {loading ? (
            <span>Processing Ingestion Pipeline...</span>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              <span>Submit Media to Wire</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
