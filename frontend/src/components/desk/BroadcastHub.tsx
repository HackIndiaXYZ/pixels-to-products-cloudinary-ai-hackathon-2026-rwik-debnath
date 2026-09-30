import React, { useState } from 'react';
import type { MediaAsset } from '../../types';
import { Tv, Smartphone, LayoutGrid, Film, Copy, Check } from 'lucide-react';

interface BroadcastHubProps {
  asset: MediaAsset;
}

export const BroadcastHub: React.FC<BroadcastHubProps> = ({ asset }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const urls = asset.syndication_urls || {};

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Autonomous Broadcast Syndication Hub</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                Zero Storage Duplication
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic URL transformations generated on the fly directly from the canonical asset.
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-400 font-mono hidden sm:inline-block">
          Edge CDN Streaming
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. 16:9 Linear Broadcast Feed */}
        <div className="bg-slate-50/70 border border-slate-100 hover:border-slate-200 rounded-xl p-3.5 space-y-3 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                <Tv className="w-3.5 h-3.5 text-blue-600" />
                <span>16:9 Broadcast Feed</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                c_fill,ar_16:9
              </span>
            </div>

            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200/80 flex items-center justify-center">
              {urls.broadcast_16_9 ? (
                <img
                  src={urls.broadcast_16_9}
                  alt="16:9 Broadcast Feed"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
              ) : (
                <span className="text-xs text-slate-400">Generating URL...</span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Lower-third breaking banner (`l_text`) + subject-aware center crop.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => handleCopy('16_9', urls.broadcast_16_9)}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 rounded-lg flex items-center justify-center space-x-1.5 transition border border-slate-200 shadow-xs cursor-pointer active:scale-98"
            >
              {copiedKey === '16_9' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedKey === '16_9' ? 'Copied CDN Link' : 'Copy 16:9 Edge URL'}</span>
            </button>
          </div>
        </div>

        {/* 2. 9:16 Social Story / Reel */}
        <div className="bg-slate-50/70 border border-slate-100 hover:border-slate-200 rounded-xl p-3.5 space-y-3 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span>9:16 Vertical Reel</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                b_auto:predominant
              </span>
            </div>

            <div className="h-44 bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200/80 flex items-center justify-center">
              {urls.social_9_16 ? (
                <img
                  src={urls.social_9_16}
                  alt="9:16 Vertical Reel"
                  className="h-full w-auto object-cover mx-auto group-hover:scale-102 transition-transform duration-300"
                />
              ) : (
                <span className="text-xs text-slate-400">Generating URL...</span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Smart padding with predominant color blur fill for horizontal media.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => handleCopy('9_16', urls.social_9_16)}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 rounded-lg flex items-center justify-center space-x-1.5 transition border border-slate-200 shadow-xs cursor-pointer active:scale-98"
            >
              {copiedKey === '9_16' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedKey === '9_16' ? 'Copied CDN Link' : 'Copy 9:16 Edge URL'}</span>
            </button>
          </div>
        </div>

        {/* 3. 1:1 Fast-Loading Wire Micro-Card */}
        <div className="bg-slate-50/70 border border-slate-100 hover:border-slate-200 rounded-xl p-3.5 space-y-3 flex flex-col justify-between transition-all group">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
                <span>1:1 Wire Micro-Card</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                f_auto, q_auto
              </span>
            </div>

            <div className="h-44 bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200/80 flex items-center justify-center">
              {urls.feed_1_1 ? (
                <img
                  src={urls.feed_1_1}
                  alt="1:1 Micro Card"
                  className="w-32 h-32 rounded-lg object-cover shadow-sm group-hover:scale-102 transition-transform duration-300"
                />
              ) : (
                <span className="text-xs text-slate-400">Generating URL...</span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Subject crop with auto-format and compression for instant loading.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => handleCopy('1_1', urls.feed_1_1)}
              className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 rounded-lg flex items-center justify-center space-x-1.5 transition border border-slate-200 shadow-xs cursor-pointer active:scale-98"
            >
              {copiedKey === '1_1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedKey === '1_1' ? 'Copied CDN Link' : 'Copy 1:1 Edge URL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Autonomous Video Highlight Reel */}
      {urls.video_highlight_6s && (
        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 flex items-center space-x-2">
              <Film className="w-4 h-4 text-blue-600" />
              <span>Autonomous 6-Second Highlight Reel (`e_preview`)</span>
            </span>
            <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
              e_preview:duration_6:max_seg_3
            </span>
          </div>

          <video
            controls
            src={urls.video_highlight_6s}
            className="w-full max-h-60 rounded-lg bg-black border border-slate-200"
          />

          <div className="flex justify-end">
            <button
              onClick={() => handleCopy('video_reel', urls.video_highlight_6s)}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
            >
              {copiedKey === 'video_reel' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Highlight Video URL</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
