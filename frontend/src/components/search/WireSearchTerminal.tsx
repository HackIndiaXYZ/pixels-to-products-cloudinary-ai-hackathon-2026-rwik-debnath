import React, { useState } from 'react';
import type { MediaAsset } from '../../types';
import { Search, Terminal, CornerDownLeft } from 'lucide-react';

interface WireSearchTerminalProps {
  onSelectAsset: (asset: MediaAsset) => void;
}

export const WireSearchTerminal: React.FC<WireSearchTerminalProps> = ({ onSelectAsset }) => {
  const [query, setQuery] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [urgency, setUrgency] = useState('');
  const [results, setResults] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (reviewStatus) params.append('review_status', reviewStatus);
      if (incidentType) params.append('incident_type', incidentType);
      if (urgency) params.append('urgency', urgency);

      const res = await fetch(`/api/v1/search/query?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data: MediaAsset[] = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Error running search:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Cloudinary Search API Terminal</span>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                Lucene Queries
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Query media assets by structured metadata, tags, and review statuses in real time.
            </p>
          </div>
        </div>

        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-flex items-center space-x-1.5">
          <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
          <span>Cloudinary Search API (Lucene)</span>
        </span>
      </div>

      <form onSubmit={handleSearch} className="space-y-3.5">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. folder:presswire* AND tags:breaking AND -status:rejected"
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Searching...' : 'Query Wire'}</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Facet Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={reviewStatus}
            onChange={(e) => setReviewStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Review Statuses</option>
            <option value="approved">Approved & Redacted</option>
            <option value="action_required">Action Required</option>
            <option value="quarantined">Quarantined (Moderation)</option>
          </select>

          <select
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Incident Types</option>
            <option value="breaking_news">Breaking News</option>
            <option value="protest">Civil Protest</option>
            <option value="wildfire">Wildfire</option>
            <option value="transit">Transit</option>
          </select>

          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Urgencies</option>
            <option value="breaking">Breaking Priority</option>
            <option value="standard">Standard Priority</option>
          </select>
        </div>
      </form>

      {/* Results View */}
      {results.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <p className="text-xs font-semibold text-slate-700">
            Matching Assets ({results.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
            {results.map((asset) => (
              <div
                key={asset.public_id}
                onClick={() => onSelectAsset(asset)}
                className="p-3 bg-slate-50/70 border border-slate-100 hover:border-blue-300 rounded-xl cursor-pointer transition flex items-center space-x-3 group"
              >
                <img
                  src={asset.syndication_urls?.feed_1_1 || asset.secure_url}
                  alt="Thumb"
                  onError={(e) => {
                    if (asset.secure_url && e.currentTarget.src !== asset.secure_url) {
                      e.currentTarget.src = asset.secure_url;
                    }
                  }}
                  className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs text-slate-900 font-semibold truncate group-hover:text-blue-600 transition-colors">
                    {asset.headline || asset.public_id}
                  </p>
                  <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                    {asset.incident_type.replace('_', ' ')} • {asset.review_status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
