import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import VideoCard from "../components/VideoCard";
import { SkeletonGrid } from "../components/Loader";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

const CATEGORIES = ["All", "Education", "Podcast", "Movies", "Gaming", "Music", "Live", "Programming", "AI", "Sports"];

const Home = () => {
  const { theme } = useTheme();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const endpoint = activeCategory === "All"
          ? "http://localhost:5001/api/home/recommended"
          : `http://localhost:5001/api/search?q=${encodeURIComponent(activeCategory)}`;
        const res = await axios.get(endpoint);
        setVideos(res.data);
      } catch (err) { setError("Failed to load videos."); }
      finally { setLoading(false); }
    };
    fetchVideos();
  }, [activeCategory]);

  return (
    <div className="p-3 sm:p-4 w-full max-w-[1800px] mx-auto min-h-screen">
      {/* Category chips */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar sticky top-0 z-20 pt-1" 
        style={{ backgroundColor: theme.bg }}>
        {CATEGORIES.map((cat) => (
          <motion.button whileTap={{ scale: 0.95 }} key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition-all"
            style={{
              backgroundColor: activeCategory === cat ? theme.chipActive : theme.chip,
              color: activeCategory === cat ? theme.chipActiveText : theme.text,
            }}
            onMouseEnter={(e) => { if (activeCategory !== cat) e.currentTarget.style.backgroundColor = theme.chipHover; }}
            onMouseLeave={(e) => { if (activeCategory !== cat) e.currentTarget.style.backgroundColor = theme.chip; }}>
            {cat}
          </motion.button>
        ))}
      </div>

      {error ? (
        <div className="text-center mt-10 p-4 rounded-lg" style={{ backgroundColor: theme.bgSecondary, color: theme.accentRed }}>{error}</div>
      ) : loading ? (
        <SkeletonGrid count={12} />
      ) : (
        <div className="flex flex-col gap-10">
          {/* Main Grid for Mixed Content */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
            <AnimatePresence>
              {videos.map((item, idx) => {
                if (item.type === "shorts_shelf") {
                  return (
                    <div key="shorts-shelf-root" className="col-span-full py-6 border-y" style={{ borderColor: theme.bgSecondary }}>
                      <div className="flex items-center gap-2 mb-6">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/f/fc/Youtube_shorts_icon.svg" alt="Shorts" className="w-6 h-6" />
                        <span className="font-bold text-xl" style={{ color: theme.text }}>Shorts</span>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                        {item.items.map((short) => (
                          <div key={short.videoId} className="flex-shrink-0 w-[160px] sm:w-[210px] group flex flex-col">
                            <Link to={`/shorts?id=${short.videoId}`} className="aspect-[9/16] rounded-2xl overflow-hidden relative shadow-lg" style={{ backgroundColor: theme.bgSecondary }}>
                              <img src={short.thumbnail} alt={short.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <Link to={`/shorts?id=${short.videoId}`} className="mt-3 text-sm font-medium line-clamp-2 leading-snug hover:underline" style={{ color: theme.text }}>
                              {short.title}
                            </Link>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center text-[8px] font-bold">
                                {short.channelAvatar ? (
                                  <img src={short.channelAvatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  "?"
                                )}
                              </div>
                              <span className="text-[11px]" style={{ color: theme.textSecondary }}>Shorts</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <motion.div key={item.videoId || idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: (idx % 20) * 0.02 }}>
                    <VideoCard video={item} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
