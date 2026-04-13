import React, { useState, useEffect } from "react";
import axios from "axios";
import VideoCard from "../components/VideoCard";
import { SkeletonGrid } from "../components/Loader";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

const CATEGORIES = ["All", "Gaming", "Music", "Live", "Mixes", "News", "Programming", "Podcast", "AI", "Sports"];

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
          ? "http://localhost:5001/api/trending"
          : `http://localhost:5001/api/search?q=${encodeURIComponent(activeCategory)}`;
        const res = await axios.get(endpoint);
        setVideos(res.data);
      } catch (err) { setError("Failed to load videos."); }
      finally { setLoading(false); }
    };
    fetchVideos();
  }, [activeCategory]);

  return (
    <div className="p-3 sm:p-4 w-full max-w-[1800px] mx-auto">
      {/* Category chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 hide-scrollbar">
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
          <AnimatePresence>
            {videos.map((video, idx) => (
              <motion.div key={video.videoId || idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.02 }}>
                <VideoCard video={video} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default Home;
