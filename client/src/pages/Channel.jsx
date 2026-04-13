import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Loader } from "../components/Loader";
import VideoCard from "../components/VideoCard";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useTheme } from "../context/ThemeContext";
import { Bell, CheckCircle2, ExternalLink } from "lucide-react";

const TABS = ["Videos", "Shorts", "About"];

const Channel = () => {
  const { channelId } = useParams();
  const { theme } = useTheme();

  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Videos");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [chRes, vidRes] = await Promise.all([
          axios.get(`http://localhost:5001/api/channel/${channelId}`),
          axios.get(`http://localhost:5001/api/channel/${channelId}/videos`),
        ]);
        setChannel(chRes.data);
        setVideos(vidRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [channelId]);

  const handleSubscribe = () => {
    setIsSubscribed(!isSubscribed);
    toast(isSubscribed ? "Unsubscribed" : "Subscribed!", { icon: isSubscribed ? "ℹ️" : "🔔" });
  };

  if (loading) return <div className="mt-20"><Loader /></div>;
  if (!channel) return <div className="text-center mt-20" style={{ color: theme.textMuted }}>Channel not found.</div>;

  const subsFmt = channel.subscriberCount
    ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(channel.subscriberCount)
    : "0";
  const videosFmt = channel.videoCount
    ? new Intl.NumberFormat("en-US").format(channel.videoCount)
    : "0";

  // Filter shorts (< 60s) vs regular videos
  const shortsList = videos.filter((v) => {
    if (!v.duration) return false;
    const m = v.duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!m) return false;
    const h = m[1] ? parseInt(m[1]) : 0;
    const min = m[2] ? parseInt(m[2]) : 0;
    const s = m[3] ? parseInt(m[3]) : 0;
    return h === 0 && min === 0 && s <= 60;
  });

  const regularVideos = videos.filter((v) => !shortsList.includes(v));

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      {/* ── Banner ── */}
      {channel.banner && (
        <div className="w-full h-[100px] sm:h-[150px] md:h-[200px] overflow-hidden rounded-b-xl">
          <img
            src={`${channel.banner}=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj`}
            alt="banner"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* ── Channel info ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-4 sm:px-6 py-5">
        <img
          src={channel.avatar}
          alt={channel.title}
          className="w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>{channel.title}</h1>
            <CheckCircle2 size={18} style={{ color: theme.textSecondary }} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: theme.textSecondary }}>
            {channel.customUrl && <span>{channel.customUrl}</span>}
            {channel.customUrl && <span>•</span>}
            <span>{subsFmt} subscribers</span>
            <span>•</span>
            <span>{videosFmt} videos</span>
          </div>
          <p className="text-sm mt-1 line-clamp-1" style={{ color: theme.textMuted }}>
            {channel.description || "No description"}
          </p>

          {/* Open on YouTube */}
          <a
            href={`https://www.youtube.com/channel/${channelId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs mt-1 hover:underline"
            style={{ color: theme.accent }}
          >
            Open on YouTube <ExternalLink size={12} />
          </a>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSubscribe}
          className="px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors"
          style={{
            backgroundColor: isSubscribed ? theme.subscribedBg : theme.subscribeBg,
            color: isSubscribed ? theme.subscribedText : theme.subscribeText,
          }}
        >
          {isSubscribed ? (
            <>
              <Bell size={16} /> Subscribed
            </>
          ) : (
            "Subscribe"
          )}
        </motion.button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 px-4 sm:px-6" style={{ borderBottom: `1px solid ${theme.border}` }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-3 text-sm font-medium transition-colors relative"
            style={{
              color: activeTab === tab ? theme.text : theme.textSecondary,
            }}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ backgroundColor: theme.text }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {activeTab === "Videos" && (
            <motion.div key="videos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
              {regularVideos.map((v, i) => (
                <motion.div key={v.videoId || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <VideoCard video={v} />
                </motion.div>
              ))}
              {regularVideos.length === 0 && (
                <p style={{ color: theme.textMuted }}>No videos found.</p>
              )}
            </motion.div>
          )}

          {activeTab === "Shorts" && (
            <motion.div key="shorts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {shortsList.length > 0 ? shortsList.map((v, i) => (
                <motion.div key={v.videoId || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link to={`/video/${v.videoId}`} className="group">
                    <div className="aspect-[9/16] rounded-xl overflow-hidden" style={{ backgroundColor: theme.bgSecondary }}>
                      <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    </div>
                    <h4 className="text-sm font-medium mt-2 line-clamp-2" style={{ color: theme.text }}>{v.title}</h4>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {new Intl.NumberFormat("en-US", { notation: "compact" }).format(v.viewCount || 0)} views
                    </p>
                  </Link>
                </motion.div>
              )) : (
                <p style={{ color: theme.textMuted }}>No shorts found for this channel.</p>
              )}
            </motion.div>
          )}

          {activeTab === "About" && (
            <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="max-w-2xl">
              <h3 className="text-base font-semibold mb-3" style={{ color: theme.text }}>Description</h3>
              <p className="text-sm whitespace-pre-line" style={{ color: theme.textSecondary }}>
                {channel.description || "No description available."}
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <h3 className="text-base font-semibold" style={{ color: theme.text }}>Stats</h3>
                <div className="flex gap-6 mt-2">
                  <div>
                    <p className="text-lg font-bold" style={{ color: theme.text }}>
                      {new Intl.NumberFormat("en-US").format(channel.viewCount || 0)}
                    </p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>Total views</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: theme.text }}>{subsFmt}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>Subscribers</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: theme.text }}>{videosFmt}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>Videos</p>
                  </div>
                </div>
                {channel.country && (
                  <p className="text-sm mt-4" style={{ color: theme.textSecondary }}>
                    📍 {channel.country}
                  </p>
                )}
                <a
                  href={`https://www.youtube.com/channel/${channelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm mt-2 hover:underline"
                  style={{ color: theme.accent }}
                >
                  View on YouTube <ExternalLink size={14} />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Channel;
