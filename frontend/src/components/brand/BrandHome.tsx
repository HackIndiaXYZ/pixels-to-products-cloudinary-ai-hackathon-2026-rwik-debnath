import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  ShieldCheck,
  Tv,
  Smartphone,
  Square,
  Globe,
  SlidersHorizontal,
  ArrowRight,
  Layers,
  MapPin,
  Copy,
  ChevronRight,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Lock,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { PressWireLogo } from './PressWireLogo';

interface BrandHomeProps {
  onNavigate: (route: 'desk' | 'submit') => void;
}

// ---------------------------------------------------------------------------
// Reusable Moody Video Player Component
// ---------------------------------------------------------------------------
interface VideoPlayerCardProps {
  src: string;
  badge: string;
  badgeColor?: string;
  title?: string;
  aspectRatio?: string;
  className?: string;
}

const VideoPlayerCard: React.FC<VideoPlayerCardProps> = ({
  src,
  badge,
  badgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  title,
  aspectRatio = 'aspect-[16/10]',
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const restartVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden bg-[#0D0F14] border border-white/[0.08] shadow-2xl transition-all duration-300 hover:border-white/20 ${className}`}
    >
      {/* Studio Header Strip */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#12151C]/90 border-b border-white/[0.06] backdrop-blur-md select-none">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          {title && (
            <span className="text-[11px] font-semibold text-slate-300 tracking-tight pl-2">
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border tracking-wider uppercase ${badgeColor}`}
          >
            {badge}
          </span>
        </div>
      </div>

      {/* Video Viewport */}
      <div
        className={`relative w-full ${aspectRatio} bg-black/60 cursor-pointer overflow-hidden flex items-center justify-center`}
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
        />

        {/* Ambient overlay glow on edges */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]" />

        {/* Subtle Hover Play/Pause Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="p-3 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white shadow-xl transform transition-transform group-hover:scale-105">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white translate-x-0.5" />}
          </div>
        </div>

        {/* Bottom Quick Controls Bar */}
        <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-white text-[10px] font-mono">
          <button
            type="button"
            onClick={restartVideo}
            className="p-1 hover:text-blue-400 transition cursor-pointer"
            title="Replay from start"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <span className="text-slate-500">|</span>
          <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Transformation Specs Matrix
// ---------------------------------------------------------------------------
interface TransformationTab {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  transformationCode: string;
  badge: string;
  resolution: string;
}

const TRANSFORMATION_TABS: TransformationTab[] = [
  {
    id: 'broadcast',
    label: '16:9 Linear Broadcast',
    icon: Tv,
    description:
      'Subject-aware smart crop with automated breaking news lower-third chyron banner and red lead badge.',
    transformationCode:
      'c_fill,ar_16:9,g_auto:subject / l_text:Arial_28_bold:BREAKING%20NEWS,g_south_west,x_30,y_40,co_white,b_rgb:d90429',
    badge: 'Linear TV & Web Playout',
    resolution: '1920 × 1080',
  },
  {
    id: 'social',
    label: '9:16 Social Reel',
    icon: Smartphone,
    description:
      'Vertical smartphone frame preserving full horizontal context using predominant color background auto-fill.',
    transformationCode:
      'c_fill,ar_9:16,g_auto:subject,b_auto:predominant / f_auto,q_auto',
    badge: 'Reels, TikTok, Shorts',
    resolution: '1080 × 1920',
  },
  {
    id: 'feed',
    label: '1:1 Wire Feed',
    icon: Square,
    description:
      'Square crop with automated subject centering and adaptive quality compression for news wire API consumers.',
    transformationCode:
      'c_fill,ar_1:1,g_auto:subject / f_auto,q_auto',
    badge: 'Wire Feeds & X/Twitter',
    resolution: '1080 × 1080',
  },
  {
    id: 'master',
    label: 'Clean Master Delivery',
    icon: Globe,
    description:
      'Full-resolution origin delivery with selective privacy pixelation applied, completely free of burned lower thirds.',
    transformationCode:
      'e_pixelate_faces:9 / f_auto,q_auto',
    badge: 'Global Syndicate Master',
    resolution: 'Source Resolution',
  },
];

export const BrandHome: React.FC<BrandHomeProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<string>('broadcast');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const selectedTabData =
    TRANSFORMATION_TABS.find((t) => t.id === activeTab) || TRANSFORMATION_TABS[0];

  return (
    <div className="min-h-screen bg-[#08090C] text-slate-100 font-sans selection:bg-blue-600/30 selection:text-white antialiased flex flex-col relative overflow-x-hidden">
      {/* Moody Ambient Background Gradient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-blue-600/12 via-indigo-600/5 to-transparent blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-0 w-[600px] h-[500px] bg-gradient-to-bl from-rose-600/8 via-purple-600/5 to-transparent blur-[150px] pointer-events-none -z-10" />
      <div className="absolute top-[2000px] left-0 w-[700px] h-[600px] bg-gradient-to-tr from-cyan-600/8 via-blue-600/5 to-transparent blur-[160px] pointer-events-none -z-10" />

      {/* =========================================================================
          STICKY NAVBAR (Moody Translucent Glass)
         ========================================================================= */}
      <nav className="sticky top-0 z-50 w-full bg-[#08090C]/80 backdrop-blur-xl border-b border-white/[0.08] transition-all">
        <div className="max-w-6xl mx-auto px-6 h-15 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <PressWireLogo
              size="lg"
              variant="full"
              theme="dark"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8 text-xs font-medium text-slate-400">
            <a href="#live-wire" className="hover:text-white transition">
              Live Wire
            </a>
            <a href="#privacy" className="hover:text-white transition">
              Selective Privacy & OCR
            </a>
            <a href="#geo-clustering" className="hover:text-white transition">
              Geo-Clustering
            </a>
            <a href="#packaging" className="hover:text-white transition">
              Zero-Storage Playout
            </a>
            <a href="#pricing" className="hover:text-white transition">
              Station Pricing
            </a>
          </div>

          {/* Primary Action Gateways */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('submit')}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              Submit Scoop
            </button>

            <button
              onClick={() => onNavigate('desk')}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <span>Editorial Desk</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/80" />
            </button>
          </div>
        </div>
      </nav>

      {/* =========================================================================
          HERO SECTION (High-Impact Broadcast Headline + Live Intake Cockpit Video)
         ========================================================================= */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-5xl mx-auto px-6 text-center">
          {/* Breaking Wire Live Ticker Pill */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.12] mb-6 shadow-inner backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest uppercase text-slate-300 font-semibold">
              Autonomous Breaking News Intake & Packaging
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-[11px] font-mono text-emerald-400">Zero-Storage CDN</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] max-w-4xl mx-auto">
            From raw citizen dispatch to broadcast wire{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
              in seconds.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
            Verify eyewitness dispatches, selectively redact civilian bystanders, cluster multi-angle takes,
            and syndicate to linear TV, reels, and feeds on-the-fly—powered by Cloudinary.
          </p>

          {/* Action CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={() => onNavigate('desk')}
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm shadow-xl shadow-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-900" />
              <span>Launch Editorial Desk</span>
            </button>

            <button
              onClick={() => onNavigate('submit')}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.12] font-semibold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <UploadCloud className="w-4 h-4 text-slate-400" />
              <span>Submit Eyewitness Scoop</span>
            </button>
          </div>

          {/* Metrics Strip */}
          <div className="mt-12 pt-8 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto text-left">
            <div>
              <div className="text-2xl font-extrabold font-mono text-white">0</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Duplicate Files Stored</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono text-emerald-400">&lt; 500ms</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">SSE Intake Acknowledgement</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono text-blue-400">100%</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Bystander Privacy Compliance</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold font-mono text-purple-400">4 Formats</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Single Origin URL Chaining</div>
            </div>
          </div>
        </div>

        {/* HERO VIDEO SHOWCASE: Real-Time Inbound Wire Stream */}
        <div id="live-wire" className="mt-14 max-w-5xl mx-auto px-6">
          <div className="relative">
            {/* Ambient Backlight Glow */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-purple-600/30 blur-xl opacity-60 pointer-events-none" />

            <VideoPlayerCard
              src="/demos/line_wire_real-time_intake.mp4"
              title="PressWire Autonomous Intake & Dispatch Pipeline"
              badge="LIVE WIRE INGESTION • SSE STREAM"
              badgeColor="text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
              aspectRatio="aspect-[1432/1080]"
            />
          </div>

          {/* Telemetry Annotation under Hero Video */}
          <div className="mt-3 flex flex-wrap items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-slate-400 gap-2">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Real-time intake stream with live SSE delivery & automated Rekognition moderation</span>
            </div>
            <span className="text-slate-500">Intake-to-dispatch live sequence</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: SELECTIVE PRIVACY & LICENSE PLATE OCR (Feature 1 Video)
         ========================================================================= */}
      <section id="privacy" className="py-24 border-t border-white/[0.08] bg-[#0A0C10] relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Video Left */}
            <div className="lg:col-span-7">
              <VideoPlayerCard
                src="/demos/license_plate_ocr.mp4"
                title="Selective Face, Plate & Aadhaar Document Redaction"
                badge="EXPLICIT API + PII OCR"
                badgeColor="text-rose-400 bg-rose-500/10 border-rose-500/30"
                aspectRatio="aspect-[16/8.6]"
              />
            </div>

            {/* Content Right */}
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-rose-400 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Selective Privacy & PII Redaction</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Protect innocent civilians. Keep public figures clear.
              </h2>

              <p className="text-sm text-slate-400 leading-relaxed font-normal">
                Never blur elected officials or reporters; never expose accidental bystanders or private citizen credentials.
                PressWire scans and pushes selective coordinates directly to Cloudinary’s{' '}
                <code className="text-rose-300 font-mono text-xs bg-rose-500/10 px-1 py-0.5 rounded">face_coordinates</code>{' '}
                matrix—pixelating civilian faces, vehicle license plates, and sensitive identity documents (Aadhaar cards, PAN, driver licenses) on the CDN edge without altering original media.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-rose-400 font-mono text-[10px] font-bold">01</span>
                  </div>
                  <span>
                    <strong className="text-white font-semibold">1-Click Triage Canvas:</strong> Toggle detected faces between Exempt (Public Figure) and Redacted (Civilian).
                  </span>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-rose-400 font-mono text-[10px] font-bold">02</span>
                  </div>
                  <span>
                    <strong className="text-white font-semibold">Plate & Aadhaar Document OCR:</strong> AI engine automatically scans and pixelates vehicle registration numbers and national identity cards (Aadhaar, PAN, phone numbers).
                  </span>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-rose-400 font-mono text-[10px] font-bold">03</span>
                  </div>
                  <span>
                    <strong className="text-white font-semibold">Edge Pixelation:</strong> Deterministic <code className="text-rose-300 font-mono text-[11px]">e_pixelate_faces:9</code> blur rendered dynamically from a single origin.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: SPATIOTEMPORAL GEO-CLUSTERING (Feature 2 Video)
         ========================================================================= */}
      <section id="geo-clustering" className="py-24 border-t border-white/[0.08] bg-[#08090C] relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Content Left */}
            <div className="lg:col-span-5 space-y-4 order-2 lg:order-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5" />
                <span>Spatiotemporal Geo-Clustering</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Bundle multi-angle eyewitness dispatches automatically.
              </h2>

              <p className="text-sm text-slate-400 leading-relaxed font-normal">
                Major breaking incidents generate multiple viewpoints across the same perimeter.
                Paste any Google Maps link (<code className="text-blue-300 font-mono text-xs bg-blue-500/10 px-1 py-0.5 rounded">maps.app.goo.gl</code>) to set a canonical geo-anchor.
                PressWire dynamically clusters all media within your perimeter radius into a unified story package.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-blue-400 font-mono text-[10px] font-bold">01</span>
                  </div>
                  <span>
                    <strong className="text-white font-semibold">Google Maps URL Resolution:</strong> Paste short or long Maps links; backend resolves canonical coordinates.
                  </span>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-blue-400 font-mono text-[10px] font-bold">02</span>
                  </div>
                  <span>
                    <strong className="text-white font-semibold">Dynamic Perimeter Radius:</strong> Slide from 0.1 km to 10.0 km to expand or contract clustering bounds in real-time.
                  </span>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-blue-400 font-mono text-[10px] font-bold">03</span>
                  </div>
                  <span>
                    <strong className="text-white font-semibold">Direct File Drop:</strong> Drop footage from your desktop straight onto any package card to ingest and cluster immediately.
                  </span>
                </div>
              </div>
            </div>

            {/* Video Right */}
            <div className="lg:col-span-7 order-1 lg:order-2">
              <VideoPlayerCard
                src="/demos/spatiotemporal_geo-clustering.mp4"
                title="Spatiotemporal Geo-Anchor & Perimeter Radius Slider"
                badge="HAVERSINE + MAPS API"
                badgeColor="text-blue-400 bg-blue-500/10 border-blue-500/30"
                aspectRatio="aspect-[16/9.6]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: ZERO-STORAGE DYNAMIC SYNDICATION (Feature 3 Video + Chaining)
         ========================================================================= */}
      <section id="packaging" className="py-24 border-t border-white/[0.08] bg-[#0B0D12] relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-purple-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero-Storage Dynamic Playout</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              One origin master. Infinite broadcast derivatives.
            </h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed font-normal">
              Never re-upload duplicates or maintain local render queues. Cloudinary deterministic URL chaining renders
              linear TV chyrons, 9:16 vertical reels, and wire cards on-the-fly from a single master asset.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Video Showcase on Left */}
            <div className="lg:col-span-7">
              <VideoPlayerCard
                src="/demos/zero_storage_cdn.mp4"
                title="Live Multi-Format Broadcast & Reel Transformation"
                badge="DYNAMIC URL CHAINING"
                badgeColor="text-purple-400 bg-purple-500/10 border-purple-500/30"
                aspectRatio="aspect-[16/9.6]"
              />
            </div>

            {/* Interactive Transformation Inspector on Right */}
            <div className="lg:col-span-5 space-y-4 bg-[#11141A] rounded-2xl p-6 border border-white/[0.08] shadow-2xl">
              {/* Format Switcher Pills */}
              <div className="grid grid-cols-2 gap-2">
                {TRANSFORMATION_TABS.map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer border text-left ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
                          : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] border-white/[0.06]'
                      }`}
                    >
                      <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="truncate">{tab.label.split(' ')[0]} {tab.label.split(' ')[1]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Tab Specs */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span>{selectedTabData.label}</span>
                  <span className="font-mono text-[10px] text-slate-400 bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.08]">
                    {selectedTabData.resolution}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {selectedTabData.description}
                </p>

                {/* Cloudinary Syntax Code Box */}
                <div className="mt-4 p-3 rounded-xl bg-black/60 border border-white/[0.08] font-mono text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">
                    <span>Cloudinary URL Chaining Syntax</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(selectedTabData.transformationCode)}
                      className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedCode ? (
                        <span className="text-emerald-400 font-bold">COPIED</span>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>COPY</span>
                        </>
                      )}
                    </button>
                  </div>
                  <code className="text-emerald-400 break-all text-[11px] block leading-relaxed">
                    /{selectedTabData.transformationCode}/
                  </code>
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Zero local rendering required
                  </span>
                  <button
                    onClick={() => onNavigate('desk')}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Test on Live Desk</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: HACKATHON ARCHITECTURE & PRODUCTION READINESS BENTO
         ========================================================================= */}
      <section className="py-24 border-t border-white/[0.08] bg-[#08090C]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5" />
              <span>Production Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Engineered for broadcast wire speed
            </h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed font-normal">
              Built on battle-tested Cloudinary APIs to solve the four critical vulnerabilities of breaking journalism:
              latency, copyright risk, privacy non-compliance, and viral bandwidth bills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Bento 1: Zero Storage */}
            <div className="p-6 rounded-2xl bg-[#0F1218] border border-white/[0.08] hover:border-blue-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                  <Layers className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Zero-Duplicate Storage
                </h4>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Never duplicate assets. A single master origin is transformed on-the-fly into 16:9 TV, 9:16 reels, and 1:1 wire cards via deterministic URL chaining.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-blue-400 font-semibold uppercase">
                Cloudinary Transformations
              </div>
            </div>

            {/* Bento 2: Legal Copyright Waiver */}
            <div className="p-6 rounded-2xl bg-[#0F1218] border border-white/[0.08] hover:border-emerald-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  1-Click Copyright Waiver
                </h4>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Mobile intake mandates an irrevocable worldwide broadcast copyright license before ingestion, completely insulating syndication networks.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-emerald-400 font-semibold uppercase">
                Legal Indemnification
              </div>
            </div>

            {/* Bento 3: AI Safety & Rekognition */}
            <div className="p-6 rounded-2xl bg-[#0F1218] border border-white/[0.08] hover:border-rose-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                  <ShieldAlert className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Automated Content Safety
                </h4>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Raw EXIF hardware telemetry and Amazon Rekognition AI moderation filters quarantine graphic violence and NSFW content before reaching editorial review.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-rose-400 font-semibold uppercase">
                Zero-Trust Quarantine
              </div>
            </div>

            {/* Bento 4: Bandwidth Protection */}
            <div className="p-6 rounded-2xl bg-[#0F1218] border border-white/[0.08] hover:border-purple-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
                  <Download className="w-4.5 h-4.5" />
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Bandwidth Bill Protection
                </h4>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  1-click full-resolution master downloads empower affiliates to ingest footage directly, safeguarding newsrooms against viral cloud egress bandwidth charges.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] font-mono text-purple-400 font-semibold uppercase">
                Cost Guardrail Engine
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: STATION PRICING & LICENSING (Moody Dark Cards)
         ========================================================================= */}
      <section id="pricing" className="py-24 border-t border-white/[0.08] bg-[#0A0C10]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 bg-white/[0.05] px-3 py-1 rounded-full border border-white/[0.1]">
              Station Packaging & Licensing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-3">
              Engineered for broadcast newsrooms of every scale
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Clear pricing per broadcast market (DMA). Zero per-seat charges for rotating control room producers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            {/* Tier 1: Local Station */}
            <div className="bg-[#101319] rounded-2xl p-7 border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Independent Station</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.08]">Single DMA</span>
                </div>
                <div className="flex items-baseline space-x-1 mb-4">
                  <span className="text-4xl font-extrabold text-white tracking-tight">$1,800</span>
                  <span className="text-xs text-slate-400 font-medium">/ month</span>
                </div>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Ideal for standalone TV affiliates and metro digital desks needing fast eyewitness intake.
                </p>
                <div className="space-y-3 pt-6 border-t border-white/[0.06] text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    <span>White-Label Station Tip Line</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    <span>Irrevocable Copyright Release Waiver</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    <span>Explicit API Face, Plate & Aadhaar Document Redaction</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    <span>Dynamic 16:9 & 9:16 Packaging</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button
                  onClick={() => onNavigate('desk')}
                  className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-semibold text-xs transition cursor-pointer border border-white/[0.1]"
                >
                  Launch Station Demo
                </button>
              </div>
            </div>

            {/* Tier 2: Broadcast Group (Featured) */}
            <div className="bg-[#131720] text-white rounded-2xl p-7 border-2 border-blue-500/50 shadow-2xl shadow-blue-500/10 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-[10px] font-semibold uppercase tracking-wider text-blue-300 border border-blue-500/40">
                Most Popular
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Station Group</span>
                </div>
                <div className="flex items-baseline space-x-1 mb-4">
                  <span className="text-4xl font-extrabold text-white tracking-tight">$8,500</span>
                  <span className="text-xs text-slate-400 font-medium">/ month</span>
                </div>
                <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                  For regional broadcast networks managing multi-market sister stations with shared wire pools.
                </p>
                <div className="space-y-3 pt-6 border-t border-white/[0.1] text-xs text-slate-200">
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span>Up to 15 Broadcast Sister Stations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span>Cross-Station Wire Sharing & Live Pool Feeds</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span>Custom Station Lower-Third Chyrons & Logos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span>Spatiotemporal Geo-Anchor Engine</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span>Unlimited Dynamic URL Transformations</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button
                  onClick={() => onNavigate('desk')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer"
                >
                  Launch Group Demo
                </button>
              </div>
            </div>

            {/* Tier 3: Enterprise Network */}
            <div className="bg-[#101319] rounded-2xl p-7 border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">National Network</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.08]">Custom SLA</span>
                </div>
                <div className="flex items-baseline space-x-1 mb-4">
                  <span className="text-4xl font-extrabold text-white tracking-tight">Enterprise</span>
                </div>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  For national wire services requiring direct master playout downloads and custom legal indemnity.
                </p>
                <div className="space-y-3 pt-6 border-t border-white/[0.06] text-xs text-slate-300">
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    <span>Dedicated Bring-Your-Own-Cloud (BYOC)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    <span>1-Click Full-Resolution Playout Downloads</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    <span>C2PA Hardware Content Credentials</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                    <span>Complete Legal Indemnification & Provenance Logs</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4">
                <button
                  onClick={() => onNavigate('desk')}
                  className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-semibold text-xs transition cursor-pointer border border-white/[0.1]"
                >
                  Contact Enterprise Team
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FINAL HIGH-IMPACT CALL TO ACTION
         ========================================================================= */}
      <section className="py-24 border-t border-white/[0.08] bg-[#08090C] relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="mb-6 flex justify-center">
            <PressWireLogo size="2xl" variant="mark" theme="dark" />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            The wire speed advantage.
          </h2>
          <p className="mt-4 text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Move from breaking eyewitness uploads to television and social syndication in seconds.
            Zero storage overhead. Zero copyright ambiguity.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={() => onNavigate('desk')}
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <SlidersHorizontal className="w-4 h-4 text-white" />
              <span>Launch Editorial Desk</span>
            </button>

            <button
              onClick={() => onNavigate('submit')}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.12] font-semibold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <UploadCloud className="w-4 h-4 text-slate-400" />
              <span>Submit Eyewitness Tip</span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MOODY DARK FOOTER
         ========================================================================= */}
      <footer className="bg-[#050608] border-t border-white/[0.08] py-12 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <PressWireLogo size="md" variant="full" theme="dark" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="font-semibold text-slate-300 mb-3 uppercase tracking-wider text-[11px]">Platform</div>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => onNavigate('desk')}
                    className="hover:text-white cursor-pointer transition"
                  >
                    Editorial Control Desk
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate('submit')}
                    className="hover:text-white cursor-pointer transition"
                  >
                    Public Tip Line
                  </button>
                </li>
                <li>
                  <a href="#packaging" className="hover:text-white transition">
                    Cloudinary Transformation Pipeline
                  </a>
                </li>
                <li>
                  <a href="#geo-clustering" className="hover:text-white transition">
                    Spatiotemporal Clustering
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-slate-300 mb-3 uppercase tracking-wider text-[11px]">6 Fixed News Desks</div>
              <ul className="space-y-2">
                <li>Public Safety</li>
                <li>Severe Weather</li>
                <li>Politics & Civic</li>
                <li>Transit & Infrastructure</li>
                <li>Metro & Local</li>
                <li>General Wire</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-slate-300 mb-3 uppercase tracking-wider text-[11px]">Legal & Provenance</div>
              <ul className="space-y-2">
                <li>Irrevocable Broadcast Waiver</li>
                <li>C2PA Content Credentials</li>
                <li>Explicit API Face Redaction</li>
                <li>Vehicle Plate & Aadhaar Document Protection</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-slate-300 mb-3 uppercase tracking-wider text-[11px]">System Telemetry</div>
              <div className="space-y-2 text-[11px] font-mono">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>CDN Nodes Active</span>
                </div>
                <div>Storage Model: Zero-Duplicate</div>
                <div>Engine: Cloudinary Media API</div>
                <div>Moderation: AWS Rekognition</div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <div>
              PressWire — Autonomous Breaking Newsroom Engine. Powered by Cloudinary.
            </div>
            <div className="flex items-center space-x-4 font-mono text-slate-400">
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
