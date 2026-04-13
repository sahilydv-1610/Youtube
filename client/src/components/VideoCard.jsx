import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function getTimeAgo(dateString) {
  const s = Math.floor((new Date() - new Date(dateString)) / 1000);
  let i = Math.floor(s / 31536000); if (i >= 1) return i + (i === 1 ? " year" : " years") + " ago";
  i = Math.floor(s / 2592000); if (i >= 1) return i + (i === 1 ? " month" : " months") + " ago";
  i = Math.floor(s / 86400); if (i >= 1) return i + (i === 1 ? " day" : " days") + " ago";
  i = Math.floor(s / 3600); if (i >= 1) return i + (i === 1 ? " hour" : " hours") + " ago";
  i = Math.floor(s / 60); if (i >= 1) return i + (i === 1 ? " minute" : " minutes") + " ago";
  return "just now";
}

function formatDuration(iso) {
  if (!iso) return "";
  const m2 = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!m2) return "0:00";
  const h = m2[1] ? parseInt(m2[1]) : 0, m = m2[2] ? parseInt(m2[2]) : 0, s = m2[3] ? parseInt(m2[3]) : 0;
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

const VideoCard = ({ video }) => {
  const { theme } = useTheme();
  const { videoId, title, thumbnail, channelName, channelId, publishedAt, viewCount, duration } = video;
  const dateFormatted = publishedAt ? getTimeAgo(publishedAt) : "";
  const viewsFormatted = viewCount ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(viewCount) + " views" : "";

  return (
    <Link to={`/video/${videoId}`} className="flex flex-col group cursor-pointer w-full">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden" style={{ backgroundColor: theme.bgSecondary }}>
        <img src={thumbnail} alt={title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
        {duration && (
          <span className="absolute bottom-1.5 right-1.5 text-white text-[11px] font-medium px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
            {formatDuration(duration)}
          </span>
        )}
      </div>
      <div className="flex gap-3 mt-3 px-0.5">
        <Link to={channelId ? `/channel/${channelId}` : "#"} onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: theme.bgElevated, color: theme.text }}>
            {channelName?.charAt(0).toUpperCase()}
          </div>
        </Link>
        <div className="flex flex-col min-w-0">
          <h3 className="text-sm font-medium line-clamp-2 leading-5" style={{ color: theme.text }}>{title}</h3>
          <Link to={channelId ? `/channel/${channelId}` : "#"} onClick={(e) => e.stopPropagation()}
            className="text-[13px] mt-0.5 hover:underline" style={{ color: theme.textSecondary }}>
            {channelName}
          </Link>
          <p className="text-[12px]" style={{ color: theme.textMuted }}>
            {viewsFormatted}{viewsFormatted && dateFormatted ? " • " : ""}{dateFormatted}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;
