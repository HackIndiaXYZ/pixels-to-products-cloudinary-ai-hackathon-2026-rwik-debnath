import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  ShieldCheck,
  Tv,
  Smartphone,
  Square,
  Film,
  Globe,
  SlidersHorizontal,
  ArrowRight,
  Layers,
  Camera,
  MapPin,
  Check,
  Copy,
  ChevronRight,
  Sparkles,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { PressWireLogo } from './PressWireLogo';

interface BrandHomeProps {
  onNavigate: (route: 'desk' | 'submit') => void;
}

const ROTATING_PHRASES = [
  'Breaking news intake',
  'Provenance auditing',
  'Selective face redaction',
  'Broadcast syndication',
];

interface TransformationTab {
  id: string;
  label: string;
  icon: React.ElementType;
  aspectRatio: string;
  description: string;
  transformationCode: string;
  previewUrl: string;
  badge: string;
  isVideo?: boolean;
}

const TRANSFORMATION_TABS: TransformationTab[] = [
  {
    id: 'broadcast',
    label: '16:9 Linear Broadcast',
    icon: Tv,
    aspectRatio: '16/9',
    description:
      'Deterministic smart cropping with autonomous lower-third chyron banner and red breaking news lead tag.',
    transformationCode:
      'c_fill,ar_16:9,g_auto:subject / l_text:Arial_28_bold:BREAKING%20NEWS,g_south_west,x_30,y_40,co_white,b_rgb:d90429',
    previewUrl:
      'https://res.cloudinary.com/demo/image/upload/c_fill,ar_16:9,g_auto:subject/l_text:Arial_28_bold:BREAKING%20NEWS,g_south_west,x_30,y_40,co_white,b_rgb:d90429/sample.jpg',
    badge: 'Linear TV & Cable Wire',
  },
  {
    id: 'social',
    label: '9:16 Social Reel',
    icon: Smartphone,
    aspectRatio: '9/16',
    description:
      'Vertical smartphone frame preserving full horizontal context using predominant color background auto-fill.',
    transformationCode:
      'c_pad,ar_9:16,b_auto:predominant,g_auto:subject / f_auto,q_auto',
    previewUrl:
      'https://res.cloudinary.com/demo/image/upload/c_pad,ar_9:16,b_auto:predominant,g_auto:subject/sample.jpg',
    badge: 'TikTok, Reels, Shorts',
  },
  {
    id: 'feed',
    label: '1:1 Wire Feed Card',
    icon: Square,
    aspectRatio: '1/1',
    description:
      'Square aspect ratio with automated subject centering and adaptive quality compression for wire API consumers.',
    transformationCode:
      'c_fill,ar_1:1,g_auto:faces,e_pixelate_faces:10 / f_auto,q_auto',
    previewUrl:
      'https://res.cloudinary.com/demo/image/upload/c_fill,ar_1:1,g_auto:faces,e_pixelate_faces:10/sample.jpg',
    badge: 'Mobile App Feeds & X/Twitter',
  },
  {
    id: 'video',
    label: '6s Keyframe Highlight',
    icon: Film,
    aspectRatio: '16/9',
    description:
      'Autonomous keyframe preview extracting high-salience video segments dynamically without server-side re-encoding.',
    transformationCode:
      'c_fill,ar_16:9,so_0,du_6 / f_auto,q_auto',
    previewUrl:
      'https://res.cloudinary.com/demo/video/upload/c_fill,ar_16:9,so_0,du_6/elephants.mp4',
    badge: 'Autonomous Video Reel',
    isVideo: true,
  },
];

export const BrandHome: React.FC<BrandHomeProps> = ({ onNavigate }) => {
  // Rotating phrase animation state
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('broadcast');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [bystanderRedacted, setBystanderRedacted] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % ROTATING_PHRASES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const selectedTabData =
    TRANSFORMATION_TABS.find((t) => t.id === activeTab) || TRANSFORMATION_TABS[0];

  return (
    <div className="min-h-screen bg-white text-[#0F0F0F] font-sans selection:bg-blue-600 selection:text-white antialiased flex flex-col">
      {/* =========================================================================
          STICKY NAVBAR (Coco Alemana Style Minimalist Blur)
         ========================================================================= */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/70 transition-all">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Brand Logo */}
          <PressWireLogo
            size="lg"
            variant="full"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-7 text-xs font-medium text-slate-600">
            <a href="#provenance" className="hover:text-slate-900 transition">
              Verification & Safety
            </a>
            <a href="#transformations" className="hover:text-slate-900 transition">
              Multi-Format Packaging
            </a>
            <a href="#features" className="hover:text-slate-900 transition">
              Platform Features
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition">
              Station Pricing
            </a>
          </div>

          {/* Primary Gateways */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Public Tip Line Action */}
            <button
              onClick={() => onNavigate('submit')}
              className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer active:scale-95"
            >
              Submit a Tip
            </button>

            {/* Editorial Desk Action */}
            <button
              onClick={() => onNavigate('desk')}
              className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <span>Editorial Desk</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      </nav>

      {/* =========================================================================
          HERO SECTION (Minimalist Typography & Live Precision Rhythm)
         ========================================================================= */}
      <section className="relative pt-20 pb-20 md:pt-28 md:pb-28 overflow-hidden">
        {/* Soft atmospheric gradient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-100/60 via-indigo-50/40 to-rose-50/30 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-6 text-center">
          {/* Dynamic Rotating Headline (Clean Single-Element Render, Zero Ghosting) */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-bold tracking-tight text-slate-900 leading-[1.12] text-center">
            <span className="block h-[1.28em] overflow-hidden">
              <span
                key={phraseIndex}
                className="inline-block text-blue-600 animate-phrase-in"
              >
                {ROTATING_PHRASES[phraseIndex]}
              </span>
            </span>
            <span className="text-slate-900 block mt-1">that moves at wire speed.</span>
          </h1>

          {/* Hero Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Turn eyewitness smartphone footage into broadcast-ready news packages for TV, web, and
            social — in seconds, with zero manual video editing.
          </p>

          {/* Dual Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={() => onNavigate('submit')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Submit Breaking Scoop</span>
            </button>

            <button
              onClick={() => onNavigate('desk')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-300" />
              <span>Launch Editorial Desk</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            LAYERED HERO COCKPIT ARTWORK (Coco Alemana Layered Mockup Motif)
           ========================================================================= */}
        <div className="mt-16 max-w-5xl mx-auto px-6">
          <div className="relative rounded-2xl bg-slate-900 p-2 sm:p-3 shadow-2xl border border-slate-800/80 ring-1 ring-white/10">
            {/* Cockpit Window Top Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-xs font-mono text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-sans font-semibold text-slate-300">
                  PressWire Newsroom Cockpit
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>LIVE WIRE SYNC</span>
                </span>
              </div>
            </div>

            {/* Mock Cockpit Content */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-slate-950/60 rounded-b-xl">
              {/* Left Column: Wire Feed Card */}
              <div className="md:col-span-4 bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                    <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/60 font-semibold">
                      BREAKING
                    </span>
                    <span>14:32:08 UTC</span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight line-clamp-2">
                    4-ALARM STRUCTURE FIRE NEAR CIVIC CENTER CIVIC PLAZA
                  </h3>
                  <div className="mt-3 space-y-1.5 text-[11px] font-mono text-slate-400 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sensor:</span>
                      <span className="text-slate-300">Sony Alpha 7 IV</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shutter:</span>
                      <span className="text-slate-300">1/250s • f/2.8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">GPS Coords:</span>
                      <span className="text-emerald-400">37.7793° N, 122.4192° W</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Faces Detected:</span>
                      <span className="text-amber-400">2 (1 Civilian, 1 Official)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Waiver Signed</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50">
                    Ready to Syndicate
                  </span>
                </div>
              </div>

              {/* Center & Right: Live Selective Face Redaction Canvas Simulation */}
              <div className="md:col-span-8 bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 flex flex-col">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Selective Face Triage Canvas</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setBystanderRedacted(!bystanderRedacted)}
                      className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      {bystanderRedacted ? (
                        <>
                          <EyeOff className="w-3 h-3 text-rose-400" />
                          <span>Civilian: Redacted</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 text-emerald-400" />
                          <span>Civilian: Unblurred</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800 group">
                  <img
                    src={
                      bystanderRedacted
                        ? 'https://res.cloudinary.com/demo/image/upload/c_fill,ar_16:9,g_auto:faces,e_pixelate_faces:12/sample.jpg'
                        : 'https://res.cloudinary.com/demo/image/upload/c_fill,ar_16:9,g_auto:faces/sample.jpg'
                    }
                    alt="Newsroom Preview"
                    className="w-full h-full object-cover transition-all duration-300"
                  />

                  {/* Simulated lower-third overlay */}
                  <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-lg bg-black/85 backdrop-blur-md border border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                        LIVE
                      </span>
                      <span className="text-xs font-semibold text-white tracking-tight">
                        CIVIC CENTER EMERGENCY CREWS RESPONDING
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                      16:9 LINEAR BROADCAST
                    </span>
                  </div>

                  {/* Simulated Face Bounding Boxes */}
                  {/* Face 1: Public Official (Exempt) */}
                  <div className="absolute top-[22%] left-[34%] w-[16%] h-[24%] border-2 border-emerald-400/90 rounded bg-emerald-500/10 flex items-start justify-start p-1 pointer-events-none">
                    <span className="text-[9px] font-mono font-bold bg-emerald-500 text-black px-1 rounded shadow-xs">
                      PUBLIC FIGURE • EXEMPT
                    </span>
                  </div>

                  {/* Face 2: Bystander (Civilian, Redacted) */}
                  <div
                    className={`absolute top-[28%] right-[26%] w-[15%] h-[22%] border-2 rounded transition-all duration-300 flex items-start justify-start p-1 pointer-events-none ${
                      bystanderRedacted
                        ? 'border-rose-400/90 bg-rose-500/20 backdrop-blur-md'
                        : 'border-slate-400/60 bg-transparent'
                    }`}
                  >
                    <span
                      className={`text-[9px] font-mono font-bold px-1 rounded shadow-xs ${
                        bystanderRedacted
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {bystanderRedacted ? 'BYSTANDER • REDACTED' : 'BYSTANDER • RAW'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Dynamic CDN Privacy: Bystanders pixelated on edge</span>
                  </div>
                  <span className="text-blue-400 font-semibold">Zero duplicate files stored</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: DEEP DARK SECTION (Coco Alemana Bento Section)
          "Provenance & Safety Verification"
         ========================================================================= */}
      <section id="provenance" className="bg-[#151718] text-[#F5F5F7] py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Instant verification & safety for breaking journalism
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
              Every eyewitness upload is automatically verified at intake. Camera hardware metadata,
              spatial GPS matching, and AI safety filters keep your newsroom secure before footage ever reaches the wire.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Sensor & Hardware Audit */}
            <div className="bg-[#1F2123] rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Hardware & Camera Metadata
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Extracts raw lens aperture, sensor focal length, shutter timing, and digital
                  capture timestamps directly from native EXIF packets.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 font-mono text-xs text-slate-400 space-y-1">
                <div className="text-emerald-400 font-semibold">✓ Sensor Payload Verified</div>
                <div className="text-slate-500">Delta: +00:03:12 (Within tolerance)</div>
              </div>
            </div>

            {/* Card 2: AI Content Moderation Engine */}
            <div className="bg-[#1F2123] rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Automated Safety Gates
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Cloudinary automated moderation algorithms score toxic content, graphic violence,
                  and inappropriate material, quarantining questionable media immediately.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 font-mono text-xs text-slate-400 space-y-1">
                <div className="text-emerald-400 font-semibold">✓ Violence Score: 0.02 (Safe)</div>
                <div className="text-slate-500">Quarantine Gate: PASS</div>
              </div>
            </div>

            {/* Card 3: Geolocation & Spatial Verification */}
            <div className="bg-[#1F2123] rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Verified GPS Geolocation
                </h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Cross-references device GPS coordinates against reported scene locations, logging
                  auditable coordinates for downstream wire subscribers.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/80 font-mono text-xs text-slate-400 space-y-1">
                <div className="text-amber-400 font-semibold">📍 Civic Center Metro Radius</div>
                <div className="text-slate-500">Accuracy: ±12 meters</div>
              </div>
            </div>

            {/* Wide Card: Cloudinary Selective Privacy Explicit API Engine */}
            <div className="md:col-span-3 bg-[#1F2123] rounded-2xl p-6 sm:p-8 border border-slate-800">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-[11px] font-mono text-blue-300 mb-3">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span>Selective Privacy Matrix</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    Zero-Damage Privacy Redaction
                  </h3>
                  <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                    Unlike destructive desktop blur tools that permanently overwrite pixels,
                    PressWire manipulates Cloudinary’s coordinate metadata via the Explicit API.
                    Bystanders are pixelated on the CDN edge while original high-res masters remain
                    untouched for historical legal archives.
                  </p>
                </div>

                <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs overflow-x-auto text-slate-300">
                  <div className="text-slate-500 mb-1">// Cloudinary Face Coordinate Manipulation</div>
                  <div className="text-purple-400">
                    cloudinary.uploader.explicit(
                    <span className="text-amber-300">"presswire/ingest/civic_fire_01"</span>,
                  </div>
                  <div className="pl-4 text-slate-300">
                    type=<span className="text-emerald-300">"upload"</span>,
                  </div>
                  <div className="pl-4 text-slate-300">
                    face_coordinates=[
                    <span className="text-blue-300">[240, 110, 85, 90]</span>
                    <span className="text-slate-500"> /* Bystander Coordinates Only */</span>]
                  </div>
                  <div className="text-purple-400">)</div>
                  <div className="mt-2 text-slate-500">// Resulting Public Syndication CDN URL</div>
                  <div className="text-emerald-400 break-all">
                    https://res.cloudinary.com/.../c_fill,ar_16:9,e_pixelate_faces:9/civic_fire_01.jpg
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: SOFT GRAY SECTION WITH INTERACTIVE TABBED SHOWCASE
          (Matches Coco Alemana's TabGroup Pattern)
         ========================================================================= */}
      <section id="transformations" className="bg-[#F5F5F7] text-slate-900 py-24 sm:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              One origin asset. Infinite broadcast outputs.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              Never re-upload duplicates or maintain local render queues. Every linear broadcast,
              social reel, and wire card is rendered dynamically on-the-fly via Cloudinary URLs.
            </p>
          </div>

          {/* Tab Menu Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {TRANSFORMATION_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer shadow-2xs ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                  }`}
                >
                  <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Preview Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Media Preview Visualizer */}
              <div className="lg:col-span-7">
                <div
                  className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex items-center justify-center max-h-[380px]"
                  style={{
                    aspectRatio:
                      selectedTabData.id === 'social' ? '9/16' : selectedTabData.aspectRatio,
                    maxWidth: selectedTabData.id === 'social' ? '240px' : '100%',
                    margin: selectedTabData.id === 'social' ? '0 auto' : '0',
                  }}
                >
                  {selectedTabData.isVideo ? (
                    <video
                      src={selectedTabData.previewUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={selectedTabData.previewUrl}
                      alt={selectedTabData.label}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Dynamic Lower Third Simulation on 16:9 Broadcast */}
                  {selectedTabData.id === 'broadcast' && (
                    <div className="absolute bottom-3 left-3 right-3 p-3 bg-black/85 backdrop-blur-md rounded-xl border border-white/10">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-[#D90429] text-white text-[10px] font-bold tracking-wider uppercase">
                          BREAKING WIRE
                        </span>
                        <span className="text-xs font-bold text-white tracking-tight truncate">
                          INCIDENT MONITORED NEAR DOWNTOWN
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Format Badge Indicator */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-mono text-white border border-white/20">
                    {selectedTabData.badge}
                  </div>
                </div>
              </div>

              {/* Transformation Specifications */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-semibold uppercase text-blue-600 tracking-wider">
                    Dynamic Broadcast Packaging
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                    {selectedTabData.label}
                  </h3>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    {selectedTabData.description}
                  </p>

                  <div className="mt-5 p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span>CLOUDINARY TRANSFORMATION SYNTAX</span>
                      <button
                        onClick={() => handleCopyCode(selectedTabData.transformationCode)}
                        className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Syntax</span>
                          </>
                        )}
                      </button>
                    </div>
                    <code className="text-emerald-400 break-all">
                      /{selectedTabData.transformationCode}/
                    </code>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <a
                    href={selectedTabData.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                    title="Open this transformed asset directly from Cloudinary CDN in a new browser tab"
                  >
                    <span>Open Raw CDN URL</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>

                  <button
                    onClick={() => onNavigate('desk')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-500 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Test on Live Wire</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: 4-COLUMN FEATURE GRID (Coco Alemana Performance Matrix)
         ========================================================================= */}
      <section id="features" className="py-24 sm:py-32 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Move at wire speed with zero limits
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              Built for high-pressure editorial control rooms where seconds determine exclusive
              coverage and copyright liability.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="text-base font-bold text-slate-900 tracking-tight">
                Zero-Duplicate Storage
              </h4>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Save petabytes of storage. Single master origin transforms into linear, social, and
                web crops dynamically via Cloudinary.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="text-base font-bold text-slate-900 tracking-tight">
                1-Click Copyright Waiver
              </h4>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Eyewitness intake mandates an irrevocable worldwide broadcast copyright release
                before ingestion, insulating syndicators.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <Globe className="w-5 h-5 text-indigo-600" />
              </div>
              <h4 className="text-base font-bold text-slate-900 tracking-tight">
                Sub-Second Edge Delivery
              </h4>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Cloudinary’s multi-region CDN caches transformed derivatives globally for instant
                wire syndication and fast affiliate downloads.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-4">
                <SlidersHorizontal className="w-5 h-5 text-rose-600" />
              </div>
              <h4 className="text-base font-bold text-slate-900 tracking-tight">
                7 Fixed News Desks
              </h4>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Breaking News, Public Safety, Severe Weather, Politics, Transit, Metro, and Wire.
                Deterministic taxonomy for automated agency feeds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: B2B STATION PRICING & PACKAGING (Coco Alemana Pricing Motif)
         ========================================================================= */}
      <section id="pricing" className="py-24 sm:py-32 bg-[#F5F5F7] border-t border-slate-200/80">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Station Packaging & Licensing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-3">
              Engineered for broadcast newsrooms of every scale
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              Simple pricing per broadcast market (DMA). Zero per-seat charges for rotating shift producers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Tier 1: Local Station */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Local Station</span>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Single DMA</span>
                </div>
                <div className="flex items-baseline space-x-1 mb-4">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight">$1,800</span>
                  <span className="text-sm text-slate-500 font-medium">/ month</span>
                </div>
                <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                  Ideal for standalone independent TV affiliates and metro digital desks needing fast eyewitness intake.
                </p>
                <div className="space-y-3 pt-6 border-t border-slate-100 text-xs text-slate-700">
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>1 White-Label Station Tip Line (<code className="font-mono text-[11px] text-slate-500">tips.station.com</code>)</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Mandatory Broadcast Copyright Release Waiver</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Explicit API Face Privacy Redaction</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Dynamic 16:9 Linear & 9:16 Social Packaging</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>500 Cloudinary Broadcast CDN Hours</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button
                  onClick={() => onNavigate('desk')}
                  className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs transition cursor-pointer"
                >
                  Launch Station Demo
                </button>
              </div>
            </div>

            {/* Tier 2: Broadcast Group (Featured) */}
            <div className="bg-slate-900 text-white rounded-3xl p-7 border-2 border-blue-500/80 shadow-xl flex flex-col justify-between relative overflow-hidden ring-4 ring-blue-500/10">
              <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold uppercase tracking-wider text-white">
                Most Popular
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">Station Group</span>
                </div>
                <div className="flex items-baseline space-x-1 mb-4">
                  <span className="text-4xl font-extrabold text-white tracking-tight">$8,500</span>
                  <span className="text-sm text-slate-400 font-medium">/ month</span>
                </div>
                <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                  For regional broadcast networks (Nexstar, Sinclair, Tegna) managing multi-market sister stations.
                </p>
                <div className="space-y-3 pt-6 border-t border-slate-800 text-xs text-slate-200">
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Up to 15 Broadcast Sister Stations</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Cross-Station Wire Sharing & Live Pool Feeds</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Custom Station Lower-Third Chyrons & Logos</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Unlimited Dynamic URL Transformations</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>Priority 24/7 Breaking News Desk Support</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button
                  onClick={() => onNavigate('desk')}
                  className="w-full py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
                >
                  Launch Group Demo
                </button>
              </div>
            </div>

            {/* Tier 3: Enterprise Network */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Enterprise Network</span>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Custom SLA</span>
                </div>
                <div className="flex items-baseline space-x-1 mb-4">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight">Enterprise</span>
                </div>
                <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                  For national wire services and conglomerates requiring direct broadcast playout and custom compliance.
                </p>
                <div className="space-y-3 pt-6 border-t border-slate-100 text-xs text-slate-700">
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Dedicated Cloudinary Bring-Your-Own-Cloud (BYOC)</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>1-Click Master Broadcast MP4 Playout Exports</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>C2PA Hardware Content Credentials Attestation</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Complete Legal Indemnification & Provenance Logs</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button
                  onClick={() => onNavigate('desk')}
                  className="w-full py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
                >
                  Explore Enterprise Cockpit
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: FINAL CALL TO ACTION (Coco Alemana Closing Section)
         ========================================================================= */}
      <section className="py-24 sm:py-32 bg-[#FBFBFC] border-t border-slate-200/80">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="mb-6 flex justify-center">
            <PressWireLogo size="2xl" variant="mark" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            PressWire
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            The autonomous breaking newsroom engine.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('submit')}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Submit a Tip</span>
            </button>

            <button
              onClick={() => onNavigate('desk')}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-300" />
              <span>Open Editorial Desk</span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FOOTER (Coco Alemana Minimal 3-Column Footer)
         ========================================================================= */}
      <footer className="bg-[#F5F5F7] border-t border-slate-200/70 py-12 text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-8">
            <PressWireLogo size="md" variant="full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="font-semibold text-slate-900 mb-3">Platform</div>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => onNavigate('desk')}
                    className="hover:text-slate-900 cursor-pointer"
                  >
                    Editorial Desk
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate('submit')}
                    className="hover:text-slate-900 cursor-pointer"
                  >
                    Public Tip Line
                  </button>
                </li>
                <li>
                  <a href="#transformations" className="hover:text-slate-900">
                    Cloudinary Pipeline
                  </a>
                </li>
                <li>
                  <a href="#provenance" className="hover:text-slate-900">
                    EXIF Provenance Engine
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-slate-900 mb-3">Editorial Desks</div>
              <ul className="space-y-2">
                <li>Breaking News</li>
                <li>Public Safety</li>
                <li>Severe Weather</li>
                <li>Politics & Civic</li>
                <li>Transit & Infrastructure</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-slate-900 mb-3">Legal & Provenance</div>
              <ul className="space-y-2">
                <li>Irrevocable Broadcast Waiver</li>
                <li>C2PA Content Credentials</li>
                <li>Civilian Privacy Redaction</li>
                <li>Terms of Syndication</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-slate-900 mb-3">System Telemetry</div>
              <div className="space-y-2 text-[11px] font-mono">
                <div className="flex items-center space-x-1.5 text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>CDN Nodes Operational</span>
                </div>
                <div>Storage Model: Zero-Duplicate</div>
                <div>Engine: Cloudinary Media SDK</div>
                <div>UTC Time Synced</div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <div>
              Copyright © {new Date().getFullYear()} PressWire Inc. Powered by Cloudinary. All rights
              reserved.
            </div>
            <div className="flex items-center space-x-4">
              <span>presswire.news</span>
              <span>•</span>
              <span>v1.2.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
