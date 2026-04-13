import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
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
  "shorts viral trending", "funny shorts", "amazing shorts", "satisfying shorts",
  "shorts comedy", "shorts music", "shorts gaming", "shorts sports",
  "shorts dance", "shorts cooking", "shorts animals", "shorts diy",
  "shorts facts", "shorts science", "shorts travel", "shorts fitness",
];

/* ── Single Short ── */
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
            ? `https://www.youtube.com/embed/${video.videoId}?autoplay=1&loop=1&playlist=${video.videoId}&controls=1&modestbranding=1&rel=0&playsinline=1`
            : `https://www.youtube.com/embed/${video.videoId}?modestbranding=1&rel=0`}
          title={video.title} frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-[52px] p-3 pointer-events-none"
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}>
          <div className="flex items-center gap-2 mb-1 pointer-events-auto">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white bg-white/15">
              {video.channelName?.charAt(0).toUpperCase()}
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
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const fetchingRef = useRef(false);
  const queryIndexRef = useRef(0);
  const seenIdsRef = useRef(new Set());

  // Fetch a batch of shorts
  const fetchBatch = useCallback(async (query) => {
    try {
      const res = await axios.get(`http://localhost:5001/api/search?q=${encodeURIComponent(query)}`);
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
    const q = QUERIES[queryIndexRef.current % QUERIES.length];
    queryIndexRef.current++;
    const batch = await fetchBatch(q);
    if (batch.length > 0) {
      setShorts((prev) => [...prev, ...batch]);
    }
    fetchingRef.current = false;
  }, [fetchBatch]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const batch = await fetchBatch(QUERIES[0]);
      queryIndexRef.current = 1;
      batch.forEach((v) => seenIdsRef.current.add(v.videoId));
      setShorts(batch);
      setLoading(false);
    };
    init();
  }, [fetchBatch]);

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
      const res = await axios.get(`http://localhost:5001/api/search?q=${encodeURIComponent(kw + " shorts")}`);
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
      <div ref={containerRef} onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll hide-scrollbar flex flex-col items-center"
        style={{ scrollSnapType: "y mandatory" }}>
        {shorts.map((video, idx) => (
          <div key={video.videoId || idx}
            className="w-full flex-shrink-0 flex items-center justify-center"
            style={{ height: "100%", scrollSnapAlign: "start" }}>
            <ShortCard video={video} isActive={idx === activeIndex} theme={theme} onWatched={handleWatched} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Shorts;
