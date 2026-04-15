import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api";
import { Loader } from "../components/Loader";
import {
  ThumbsUp, ThumbsDown, Share, Download,
  MoreHorizontal, CheckCircle2, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useTheme } from "../context/ThemeContext";

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

const VideoPlayer = () => {
  const { id } = useParams();
  const { theme } = useTheme();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [suggestedVideos, setSuggestedVideos] = useState([]);
  const [comments, setComments] = useState([]);
  const [descExpanded, setDescExpanded] = useState(false);

  const handleSubscribe = () => {
    setIsSubscribed(!isSubscribed);
    toast(isSubscribed ? "Unsubscribed" : "Subscribed!", { icon: isSubscribed ? "ℹ️" : "🔔" });
  };
  const handleLike = () => {
    setIsLiked(!isLiked);
    if (!isLiked) { setIsDisliked(false); toast.success("Added to Liked videos"); }
  };
  const handleDislike = () => {
    setIsDisliked(!isDisliked);
    if (!isDisliked) setIsLiked(false);
  };
  const handleShare = () => {
    navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${id}`);
    toast.success("Link copied!");
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const vidRes = await API.get(`/api/video/${id}`);
        setVideo(vidRes.data);

        // Fetch related/recommended videos (topic + same channel)
        try {
          const relRes = await API.get(`/api/related/${id}`);
          setSuggestedVideos(relRes.data.slice(0, 15));
        } catch {
          // Fallback to trending if related fails
          const trendRes = await API.get(`/api/trending`);
          setSuggestedVideos(trendRes.data.filter((v) => v.videoId !== id).slice(0, 15));
        }

        const recents = JSON.parse(localStorage.getItem("recentVideos") || "[]");
        const filtered = recents.filter((v) => v.videoId !== vidRes.data.videoId);
        localStorage.setItem("recentVideos", JSON.stringify([vidRes.data, ...filtered].slice(0, 10)));

        try {
          const commRes = await API.get(`/api/comments/${id}`);
          setComments(commRes.data);
        } catch { setComments([]); }
      } catch (err) {
        console.error(err);
        setError("Failed to load video.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="mt-20"><Loader /></div>;
  if (error) return <div className="text-center mt-20" style={{ color: "#f87171" }}>{error}</div>;
  if (!video) return null;

  const viewsFmt = video.viewCount ? new Intl.NumberFormat("en-US").format(video.viewCount) : "0";
  const likesFmt = video.likeCount ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(video.likeCount) : "0";
  const subsFmt = video.subscriberCount ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(video.subscriberCount) : "";
  const commentsFmt = video.commentCount ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(video.commentCount) : "0";

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 max-w-[1400px] mx-auto w-full">
      {/* ═══ LEFT ═══ */}
      <div className="flex-1 min-w-0">
        {/* Video */}
        <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Title */}
        <h1 className="text-lg sm:text-xl font-semibold mt-3 leading-snug" style={{ color: theme.text }}>
          {video.title}
        </h1>

        {/* Channel + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 gap-3">
          <div className="flex items-center gap-3">
            <Link to={video.channelId ? `/channel/${video.channelId}` : "#"}>
              {video.channelAvatar ? (
                <img src={video.channelAvatar} alt="" className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: theme.bgElevated, color: theme.text }}>
                  {video.channelName?.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
            <div className="mr-3">
              <Link to={video.channelId ? `/channel/${video.channelId}` : "#"}
                className="text-sm font-semibold hover:underline" style={{ color: theme.text }}>
                {video.channelName}
              </Link>
              {subsFmt && <p className="text-[12px]" style={{ color: theme.textSecondary }}>{subsFmt} subscribers</p>}
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleSubscribe}
              className="px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors"
              style={{
                backgroundColor: isSubscribed ? theme.subscribedBg : theme.subscribeBg,
                color: isSubscribed ? theme.subscribedText : theme.subscribeText,
              }}>
              {isSubscribed ? <><CheckCircle2 size={16} /> Subscribed</> : "Subscribe"}
            </motion.button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-full" style={{ backgroundColor: theme.bgElevated }}>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleLike}
                className="flex items-center gap-1.5 px-4 py-2 rounded-l-full transition-colors text-sm"
                style={{ color: isLiked ? theme.accent : theme.text, borderRight: `1px solid ${theme.border}` }}>
                <ThumbsUp size={16} className={isLiked ? `fill-[${theme.accent}]` : ""} /> {likesFmt}
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleDislike}
                className="flex items-center px-4 py-2 rounded-r-full transition-colors"
                style={{ color: isDisliked ? theme.accent : theme.text }}>
                <ThumbsDown size={16} className={isDisliked ? "fill-[#3ea6ff]" : ""} />
              </motion.button>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors"
              style={{ backgroundColor: theme.bgElevated, color: theme.text }}>
              <Share size={16} /> Share
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => toast("Download started…", { icon: "⬇️" })}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors"
              style={{ backgroundColor: theme.bgElevated, color: theme.text }}>
              <Download size={16} /> Download
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => toast("More options")}
              className="p-2 rounded-full transition-colors"
              style={{ backgroundColor: theme.bgElevated, color: theme.text }}>
              <MoreHorizontal size={16} />
            </motion.button>
          </div>
        </div>

        {/* Description */}
        <div className="mt-3 rounded-xl p-3 cursor-pointer transition-colors"
          style={{ backgroundColor: theme.bgSecondary }}
          onClick={() => setDescExpanded(!descExpanded)}>
          <p className="text-sm font-medium" style={{ color: theme.text }}>
            {viewsFmt} views • {new Date(video.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </p>
          <p className={`text-sm mt-1 whitespace-pre-line break-words ${!descExpanded ? "line-clamp-3" : ""}`}
            style={{ color: theme.textSecondary }}>
            {video.description || "No description available."}
          </p>
          <button className="flex items-center gap-1 text-xs font-medium mt-2 transition-colors"
            style={{ color: theme.textMuted }}>
            {descExpanded ? <><ChevronUp size={14} />Show less</> : <><ChevronDown size={14} />Show more</>}
          </button>
        </div>

        {/* Comments */}
        <div className="mt-6">
          <h2 className="text-base font-semibold mb-5" style={{ color: theme.text }}>
            {commentsFmt} Comments
          </h2>
          <AnimatePresence>
            {comments.length > 0 ? comments.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }} className="flex gap-3 mb-4">
                <img src={c.authorAvatar} alt="" className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                  style={{ backgroundColor: theme.bgElevated }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium" style={{ color: theme.text }}>@{c.author}</span>
                    <span className="text-[11px]" style={{ color: theme.textMuted }}>{getTimeAgo(c.publishedAt)}</span>
                  </div>
                  <p className="text-sm mt-0.5 break-words" style={{ color: theme.textSecondary }}>{c.text}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button className="flex items-center gap-1 text-xs transition-colors" style={{ color: theme.textMuted }}>
                      <ThumbsUp size={13} /> {c.likeCount > 0 ? c.likeCount : ""}
                    </button>
                    <button className="flex items-center gap-1 text-xs transition-colors" style={{ color: theme.textMuted }}>
                      <ThumbsDown size={13} />
                    </button>
                    <button className="text-xs font-medium transition-colors" style={{ color: theme.textMuted }}>Reply</button>
                  </div>
                </div>
              </motion.div>
            )) : (
              <p className="text-sm" style={{ color: theme.textMuted }}>Comments unavailable.</p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ RIGHT: Suggested ═══ */}
      <div className="lg:w-[400px] flex-shrink-0 flex flex-col gap-2">
        <AnimatePresence>
          {suggestedVideos.length > 0 ? suggestedVideos.map((sv, i) => (
            <motion.div key={sv.videoId || i}
              initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}>
              <Link to={`/video/${sv.videoId}`} className="flex gap-2 group rounded-lg p-1 transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgSecondary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                <div className="relative w-[168px] h-[94px] rounded-lg overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: theme.bgSecondary }}>
                  <img src={sv.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  {sv.duration && (
                    <span className="absolute bottom-1 right-1 bg-black/85 text-white text-[10px] font-medium px-1 py-0.5 rounded">
                      {formatDuration(sv.duration)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <h4 className="text-[13px] font-medium line-clamp-2 leading-[18px]" style={{ color: theme.text }}>{sv.title}</h4>
                  <p className="text-[12px] mt-1" style={{ color: theme.textSecondary }}>{sv.channelName}</p>
                  <p className="text-[11px]" style={{ color: theme.textMuted }}>
                    {new Intl.NumberFormat("en-US", { notation: "compact" }).format(sv.viewCount || 0)} views
                  </p>
                </div>
              </Link>
            </motion.div>
          )) : (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-2 p-1 animate-pulse">
                <div className="w-[168px] h-[94px] rounded-lg" style={{ backgroundColor: theme.bgSecondary }} />
                <div className="flex flex-col flex-1 gap-2 mt-1">
                  <div className="h-3 rounded w-full" style={{ backgroundColor: theme.bgSecondary }} />
                  <div className="h-3 rounded w-4/5" style={{ backgroundColor: theme.bgSecondary }} />
                </div>
              </div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VideoPlayer;
