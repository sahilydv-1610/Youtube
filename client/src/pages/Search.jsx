import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import API from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

function getTimeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  let i = Math.floor(seconds / 31536000);
  if (i >= 1) return i + (i === 1 ? " year" : " years") + " ago";
  i = Math.floor(seconds / 2592000);
  if (i >= 1) return i + (i === 1 ? " month" : " months") + " ago";
  i = Math.floor(seconds / 86400);
  if (i >= 1) return i + (i === 1 ? " day" : " days") + " ago";
  i = Math.floor(seconds / 3600);
  if (i >= 1) return i + (i === 1 ? " hour" : " hours") + " ago";
  i = Math.floor(seconds / 60);
  if (i >= 1) return i + (i === 1 ? " minute" : " minutes") + " ago";
  return "just now";
}

function formatDuration(iso) {
  if (!iso) return "";
  const m2 = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!m2) return "0:00";
  const h = m2[1] ? parseInt(m2[1]) : 0;
  const m = m2[2] ? parseInt(m2[2]) : 0;
  const s = m2[3] ? parseInt(m2[3]) : 0;
  const ss = s.toString().padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

const Search = () => {
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) return;
      try {
        setLoading(true);
        const res = await API.get(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load search results.");
      } finally {
        setLoading(false);
      }
    };
    fetchSearchResults();
  }, [query]);

  const renderResult = (item, idx) => {
    if (item.type === "channel") {
      return (
        <motion.div
          key={item.channelId}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.04 }}
          className="py-6 border-y flex items-center gap-6 sm:gap-12 px-2 sm:px-10"
          style={{ borderColor: theme.bgSecondary }}
        >
          <Link to={`/channel/${item.channelId}`} className="flex-shrink-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold relative" 
              style={{ backgroundColor: theme.bgElevated, color: theme.text }}>
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover relative z-10" 
                  onError={(e) => { e.target.style.display = 'none'; }} />
              ) : null}
              <span className="absolute inset-0 flex items-center justify-center z-0">{item.title?.charAt(0).toUpperCase()}</span>
            </div>
          </Link>
          <div className="flex flex-col min-w-0 flex-1">
            <Link to={`/channel/${item.channelId}`} className="text-lg font-medium hover:underline" style={{ color: theme.text }}>
              {item.title}
            </Link>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
              Related to your search • Official Channel
            </p>
            <p className="text-sm mt-2 line-clamp-2 hidden sm:block" style={{ color: theme.textSecondary }}>
              {item.description}
            </p>
            <button className="mt-3 px-4 py-1.5 rounded-full text-sm font-medium w-fit transition-transform active:scale-95"
              style={{ backgroundColor: theme.text, color: theme.bg }}>
              Subscribe
            </button>
          </div>
        </motion.div>
      );
    }

    if (item.type === "shorts_shelf") {
      return (
        <div key="shorts-shelf" className="py-6 border-y" style={{ borderColor: theme.bgSecondary }}>
          <div className="flex items-center gap-2 mb-4 px-2">
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/fc/Youtube_shorts_icon.svg" alt="Shorts" className="w-5 h-5" />
            <span className="font-bold text-lg" style={{ color: theme.text }}>Shorts</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar px-2">
            {item.items.map((short, sIdx) => (
              <div key={short.videoId} className="flex-shrink-0 w-[160px] sm:w-[200px] group flex flex-col">
                <Link to={`/shorts?id=${short.videoId}`} className="aspect-[9/16] rounded-xl overflow-hidden relative" style={{ backgroundColor: theme.bgSecondary }}>
                  <img src={short.thumbnail} alt={short.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute bottom-2 left-2 text-white text-[11px] font-bold drop-shadow-lg">
                    {new Intl.NumberFormat("en-US", { notation: "compact" }).format(short.viewCount)} views
                  </div>
                </Link>
                <Link to={`/shorts?id=${short.videoId}`} className="mt-2 text-sm font-medium line-clamp-2 leading-snug" style={{ color: theme.text }}>
                  {short.title}
                </Link>
                <div className="mt-1 flex items-center gap-1.5 opacity-80">
                  <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center text-[7px] font-bold">
                    {short.channelAvatar ? (
                      <img src={short.channelAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      "?"
                    )}
                  </div>
                  <span className="text-[11px]" style={{ color: theme.textSecondary }}>Shorts Channel</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default: Video
    const video = item;
    const viewsFmt = video.viewCount
      ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(video.viewCount) + " views"
      : "";
    const timeFmt = video.publishedAt ? getTimeAgo(video.publishedAt) : "";

    return (
      <motion.div
        key={video.videoId || idx}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.04 }}
      >
        <Link to={`/video/${video.videoId}`} className="flex flex-col sm:flex-row gap-4 group">
          <div className="relative w-full sm:w-[360px] aspect-video rounded-xl overflow-hidden flex-shrink-0"
            style={{ backgroundColor: theme.bgSecondary }}>
            <img src={video.thumbnail} alt={video.title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
            {video.duration && (
              <span className="absolute bottom-2 right-2 bg-black/85 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                {formatDuration(video.duration)}
              </span>
            )}
          </div>
          <div className="flex flex-col py-0 sm:py-1 min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-medium line-clamp-2 leading-snug group-hover:text-[#3ea6ff] transition-colors"
              style={{ color: theme.text }}>
              {video.title}
            </h3>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
              {viewsFmt}{viewsFmt && timeFmt ? " • " : ""}{timeFmt}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Link to={`/channel/${video.channelId}`} onClick={(e) => e.stopPropagation()} 
                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-white/10 relative"
                style={{ color: theme.text }}>
                {video.channelAvatar ? (
                  <img src={video.channelAvatar} alt={video.channelName} className="w-full h-full object-cover relative z-10" 
                    onError={(e) => { e.target.style.display = 'none'; }} />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center z-0">{video.channelName?.charAt(0).toUpperCase()}</span>
              </Link>
              <Link to={`/channel/${video.channelId}`} onClick={(e) => e.stopPropagation()}
                className="text-xs hover:text-white transition-colors" style={{ color: theme.textSecondary }}>
                {video.channelName}
              </Link>
            </div>
            <p className="text-xs mt-3 line-clamp-2 hidden sm:block leading-relaxed" style={{ color: theme.textMuted }}>
              Experience high quality streaming of {video.title} by {video.channelName}. Click to watch now!
            </p>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1300px] min-h-screen">
      {error ? (
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: theme.bgSecondary, color: "#f87171" }}>
          {error}
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-8 max-w-[1000px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-4 animate-pulse">
              <div className="w-full sm:w-[360px] aspect-video rounded-xl flex-shrink-0" style={{ backgroundColor: theme.bgSecondary }} />
              <div className="flex flex-col gap-3 flex-1 py-1">
                <div className="h-5 rounded w-full sm:w-[90%]" style={{ backgroundColor: theme.bgSecondary }} />
                <div className="h-5 rounded w-[70%]" style={{ backgroundColor: theme.bgSecondary }} />
                <div className="h-3 rounded w-[40%] mt-2" style={{ backgroundColor: theme.bgSecondary }} />
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.bgSecondary }} />
                  <div className="h-3 rounded w-[100px]" style={{ backgroundColor: theme.bgSecondary }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 max-w-[1100px]">
          <AnimatePresence>
            {results.map((item, idx) => renderResult(item, idx))}
          </AnimatePresence>

          {results.length === 0 && !loading && (
            <div className="text-center py-20 flex flex-col items-center w-full">
              <div className="w-20 h-20 mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <img src="https://www.gstatic.com/youtube/src/web/htdocs/img/no_results_found.png" alt="No results" className="w-12 opacity-50" />
              </div>
              <p className="text-xl font-medium" style={{ color: theme.textSecondary }}>
                No results found for "{query}"
              </p>
              <p className="text-sm mt-2 max-w-sm" style={{ color: theme.textMuted }}>
                Try different keywords or check your spelling. You may also want to try more general terms.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Search;
