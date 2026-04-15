import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api";
import { Loader } from "../components/Loader";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ThumbsUp, ThumbsDown, MessageSquare, Share,
  MoreVertical, ChevronUp, ChevronDown
} from "lucide-react";

/* ── localStorage helpers ── */
const WATCH_KEY = "yt-shorts-watched";
const SKIP_KEY = "yt-shorts-skipped";
function getWatched() { return JSON.parse(localStorage.getItem(WATCH_KEY) || "[]"); }
function getSkipped() { return JSON.parse(localStorage.getItem(SKIP_KEY) || "[]"); }
function addWatched(videoId, title) {
  const list = getWatched().filter((v) => v.id !== videoId);
  list.unshift({ id: videoId, title, ts: Date.now() });
  localStorage.setItem(WATCH_KEY, JSON.stringify(list.slice(0, 50)));
}

function getTimeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "now";
  let i = Math.floor(s / 31536000); if (i >= 1) return i + "y ago";
  i = Math.floor(s / 2592000); if (i >= 1) return i + "mo ago";
  i = Math.floor(s / 86400); if (i >= 1) return i + "d ago";
  i = Math.floor(s / 3600); if (i >= 1) return i + "h ago";
  i = Math.floor(s / 60); return i + "m ago";
}

// Rotating search queries for infinite content
const QUERIES = [
  "shorts trending india", "funny hindi shorts", "amazing indian facts", "satisfying shorts",
  "bb ki vines shorts", "carryminati shorts", "tech shorts hindi", "indian food shorts",
  "bollywood dance shorts", "cricket shorts india", "vlogs hindi shorts", "diy hindi",
  "ias motivation shorts", "science facts hindi", "travel india shorts", "fitness hindi",
];

/* ── Single Short (Placeholder for performance) ── */
const ShortPlaceholder = ({ video, theme }) => {
  const viewsFmt = video.viewCount
    ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(video.viewCount) : "0";

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-[370px] rounded-xl overflow-hidden shadow-2xl">
        {/* Static Thumbnail instead of heavy iframe */}
        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover blur-[2px] opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
            <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
          </div>
        </div>
        
        {/* Standard Overlays (UI remains interactive) */}
        <div className="absolute bottom-0 left-0 right-[52px] p-3 pointer-events-none"
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-white/15" />
            <div className="h-4 w-24 bg-white/20 rounded truncate" />
          </div>
          <div className="h-4 w-full bg-white/20 rounded mb-1" />
          <div className="h-3 w-32 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
};

/* ── Single Short (Full Player) ── */
const ShortCard = ({ video, isActive, theme, onWatched }) => {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const timerRef = useRef(null);

  const viewsFmt = video.viewCount
    ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(video.viewCount) : "0";

  useEffect(() => {
    if (isActive) {
      timerRef.current = setTimeout(() => {
        addWatched(video.videoId, video.title);
        onWatched?.(video);
      }, 5000);
    } else {
      clearTimeout(timerRef.current);
    }
    return () => clearTimeout(timerRef.current);
  }, [isActive, video.videoId]);

  return (
    <div className="relative w-full h-full flex items-center justify-center"
      style={{ backgroundColor: theme.mode === "dark" ? "#000" : "#f2f2f2" }}>
      <div className="relative h-full w-full max-w-[370px] rounded-xl overflow-hidden"
        style={{ boxShadow: `0 0 40px ${theme.shadow}` }}>
        {/* YouTube embed */}
        <iframe
          className="absolute inset-0 w-full h-full"
          src={isActive
            ? `https://www.youtube.com/embed/${video.videoId}?autoplay=1&mute=1&loop=1&playlist=${video.videoId}&controls=1&modestbranding=1&rel=0&playsinline=1`
            : `https://www.youtube.com/embed/${video.videoId}?modestbranding=1&rel=0`}
          title={video.title} frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-[52px] p-3 pointer-events-none"
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}>
          <div className="flex items-center gap-2 mb-1 pointer-events-auto">
            <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold text-white bg-white/15">
              {video.channelAvatar ? (
                <img src={video.channelAvatar} alt={video.channelName} className="w-full h-full object-cover" />
              ) : (
                video.channelName?.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-[13px] font-semibold text-white truncate">{video.channelName}</span>
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); setSubscribed(!subscribed); toast(subscribed ? "Unsubscribed" : "Subscribed!", { icon: subscribed ? "ℹ️" : "🔔" }); }}
              className="ml-auto px-2.5 py-1 rounded-full text-[11px] font-medium flex-shrink-0"
              style={{ backgroundColor: subscribed ? "rgba(255,255,255,0.15)" : "#fff", color: subscribed ? "#fff" : "#000" }}>
              {subscribed ? "✓" : "Subscribe"}
            </motion.button>
          </div>
          <p className="text-[13px] text-white font-medium line-clamp-2 leading-tight">{video.title}</p>
          <p className="text-[11px] text-white/50 mt-0.5">{viewsFmt} views · {getTimeAgo(video.publishedAt)}</p>
        </div>

        {/* Right action column */}
        <div className="absolute right-1.5 bottom-14 flex flex-col items-center gap-3">
          {[
            { icon: <ThumbsUp size={20} className={liked ? "fill-white" : ""} />, label: "Like",
              fn: () => { setLiked(!liked); if (!liked) { setDisliked(false); toast.success("Liked!"); } } },
            { icon: <ThumbsDown size={20} className={disliked ? "fill-white" : ""} />, label: "Dislike",
              fn: () => { setDisliked(!disliked); if (!disliked) setLiked(false); } },
            { icon: <MessageSquare size={20} />, label: "Chat", fn: () => toast("Comments") },
            { icon: <Share size={20} />, label: "Share",
              fn: () => { navigator.clipboard.writeText(`https://youtube.com/shorts/${video.videoId}`); toast.success("Copied!"); } },
            { icon: <MoreVertical size={20} />, label: "", fn: () => toast("More") },
          ].map((b, i) => (
            <motion.button key={i} whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); b.fn(); }}
              className="flex flex-col items-center gap-0.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-white/10">
                {b.icon}
              </div>
              {b.label && <span className="text-[9px] text-white/70">{b.label}</span>}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Shorts Page ── */
const Shorts = () => {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get("id");

  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const fetchingRef = useRef(false);
  const seenIdsRef = useRef(new Set());

  // Fetch a batch of shorts
  const fetchBatch = useCallback(async () => {
    try {
      const res = await API.get(`/api/shorts/random`);
      const skipped = new Set(getSkipped());
      const newVideos = res.data.filter(
        (v) => !seenIdsRef.current.has(v.videoId) && !skipped.has(v.videoId)
      );
      newVideos.forEach((v) => seenIdsRef.current.add(v.videoId));
      return newVideos;
    } catch { return []; }
  }, []);

  // Load more shorts
  const loadMore = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const batch = await fetchBatch();
    if (batch.length > 0) {
      setShorts((prev) => [...prev, ...batch]);
    }
    fetchingRef.current = false;
  }, [fetchBatch]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      let batch = await fetchBatch();
      
      // If we have an initialId, try to fetch it specifically or ensure it's in the list
      if (initialId) {
        try {
          const res = await API.get(`/api/video/${initialId}`);
          if (res.data) {
            batch = [res.data, ...batch.filter(v => v.videoId !== initialId)];
            seenIdsRef.current.add(initialId);
          }
        } catch {}
      }
      
      setShorts(batch);
      setLoading(false);
    };
    init();
  }, [fetchBatch, initialId]);

  // Sync index to URL
  useEffect(() => {
    if (shorts.length > 0 && shorts[activeIndex]) {
      const currentId = shorts[activeIndex].videoId;
      if (currentId !== searchParams.get("id")) {
        setSearchParams({ id: currentId }, { replace: true });
      }
    }
  }, [activeIndex, shorts, setSearchParams, searchParams]);

  // Auto-load more when user nears the end
  useEffect(() => {
    if (shorts.length > 0 && activeIndex >= shorts.length - 4) {
      loadMore();
    }
  }, [activeIndex, shorts.length, loadMore]);

  // When user watches 5+ seconds, fetch similar content
  const handleWatched = useCallback(async (video) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const kw = video.title.split(/[\s\-|:]+/).slice(0, 3).join(" ");
      const res = await API.get(`/api/search?q=${encodeURIComponent(kw + " shorts")}`);
      const skipped = new Set(getSkipped());
      const fresh = res.data.filter(
        (v) => !seenIdsRef.current.has(v.videoId) && !skipped.has(v.videoId)
      );
      fresh.forEach((v) => seenIdsRef.current.add(v.videoId));
      if (fresh.length > 0) setShorts((prev) => [...prev, ...fresh]);
    } catch {}
    fetchingRef.current = false;
  }, []);

  const handleScroll = () => {
    const c = containerRef.current;
    if (!c) return;
    const idx = Math.round(c.scrollTop / c.clientHeight);
    if (idx !== activeIndex && idx >= 0 && idx < shorts.length) setActiveIndex(idx);
  };

  const scrollTo = (index) => {
    if (index < 0 || index >= shorts.length) return;
    setActiveIndex(index);
    containerRef.current?.children[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader /></div>;

  if (shorts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6" style={{ color: theme.textSecondary }}>
        <p className="text-xl font-medium mb-4">No Shorts found in your region</p>
        <p className="text-sm mb-6 opacity-70">We couldn't fetch any trending shorts right now. This might be due to API limits or connection issues.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 rounded-full font-medium transition-transform active:scale-95"
          style={{ backgroundColor: theme.text, color: theme.bg }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: theme.mode === "dark" ? "#000" : "#f2f2f2" }}>
      
      {/* Up / Down buttons */}
      <div className="absolute right-5 bottom-6 z-30 flex flex-col gap-2">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => scrollTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-20 transition-opacity"
          style={{ backgroundColor: theme.bgCard, color: theme.text, boxShadow: `0 2px 12px ${theme.shadow}` }}>
          <ChevronUp size={22} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => scrollTo(activeIndex + 1)}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-opacity"
          style={{ backgroundColor: theme.bgCard, color: theme.text, boxShadow: `0 2px 12px ${theme.shadow}` }}>
          <ChevronDown size={22} />
        </motion.button>
      </div>

      {/* Scroll container */}
      <div 
        ref={containerRef} 
        onScroll={handleScroll}
        className="w-full h-screen overflow-y-auto hide-scrollbar"
        style={{ 
          scrollSnapType: "y mandatory", 
          overscrollBehaviorY: "contain", 
          touchAction: "pan-y",
          display: "block",
          position: "relative"
        }}>
        {shorts.map((video, idx) => {
          // Keep a wider buffer of 7 videos for stability
          const isInBuffer = idx >= activeIndex - 3 && idx <= activeIndex + 4;

          return (
            <div key={video.videoId || `s-${idx}`}
              className="w-full h-screen flex-shrink-0"
              style={{ 
                scrollSnapAlign: "start", 
                scrollSnapStop: "always",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
              {isInBuffer ? (
                <ShortCard video={video} isActive={idx === activeIndex} theme={theme} onWatched={handleWatched} />
              ) : (
                <ShortPlaceholder video={video} theme={theme} />
              )}
            </div>
          );
        })}
        {/* Intersection marker for load extra data */}
        <div className="h-2 w-full" />
      </div>
    </div>
  );
};

export default Shorts;
