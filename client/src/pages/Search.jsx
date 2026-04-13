import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
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

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) return;
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:5001/api/search?q=${encodeURIComponent(query)}`);
        setVideos(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load search results.");
      } finally {
        setLoading(false);
      }
    };
    fetchSearchResults();
  }, [query]);

  return (
    <div className="p-4 sm:p-6 w-full max-w-[900px] mx-auto">
      {error ? (
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: theme.bgSecondary, color: "#f87171" }}>
          {error}
        </div>
      ) : loading ? (
        /* Skeleton loader — horizontal layout */
        <div className="flex flex-col gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-[360px] aspect-video rounded-xl flex-shrink-0" style={{ backgroundColor: theme.bgSecondary }} />
              <div className="flex flex-col gap-3 flex-1 py-1">
                <div className="h-4 rounded w-[90%]" style={{ backgroundColor: theme.bgSecondary }} />
                <div className="h-4 rounded w-[70%]" style={{ backgroundColor: theme.bgSecondary }} />
                <div className="h-3 rounded w-[40%] mt-1" style={{ backgroundColor: theme.bgSecondary }} />
                <div className="h-3 rounded w-[55%]" style={{ backgroundColor: theme.bgSecondary }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
          <AnimatePresence>
            {videos.map((video, idx) => {
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
                  <Link
                    to={`/video/${video.videoId}`}
                    className="flex flex-col sm:flex-row gap-4 group"
                  >
                    {/* Thumbnail */}
                    <div
                      className="relative w-full sm:w-[360px] aspect-video rounded-xl overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: theme.bgSecondary }}
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                      {video.duration && (
                        <span className="absolute bottom-2 right-2 bg-black/85 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                          {formatDuration(video.duration)}
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-col py-0 sm:py-1 min-w-0 flex-1">
                      <h3
                        className="text-base sm:text-lg font-medium line-clamp-2 leading-snug group-hover:text-[#3ea6ff] transition-colors"
                        style={{ color: theme.text }}
                      >
                        {video.title}
                      </h3>

                      <p className="text-xs mt-1.5" style={{ color: theme.textMuted }}>
                        {viewsFmt}{viewsFmt && timeFmt ? " • " : ""}{timeFmt}
                      </p>

                      <div className="flex items-center gap-2 mt-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                          style={{ backgroundColor: theme.bgElevated, color: theme.text }}
                        >
                          {video.channelName?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs hover:text-white transition-colors" style={{ color: theme.textSecondary }}>
                          {video.channelName}
                        </span>
                      </div>

                      <p className="text-xs mt-2 line-clamp-2 hidden sm:block" style={{ color: theme.textMuted }}>
                        Watch this video on StreamHub. Click to play.
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {videos.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-lg font-medium" style={{ color: theme.textSecondary }}>
                No results found for "{query}"
              </p>
              <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
                Try different keywords or remove search filters
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Search;
