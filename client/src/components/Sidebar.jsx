import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Flame, PlaySquare, Clock, History, ThumbsUp, Scissors, Radio } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useTheme } from "../context/ThemeContext";

const Sidebar = ({ isOpen }) => {
  const { theme } = useTheme();
  const location = useLocation();

  const menuItems = [
    { icon: <Home size={20} />, label: "Home", to: "/" },
    { icon: <Scissors size={20} />, label: "Shorts", to: "/shorts" },
    { icon: <PlaySquare size={20} />, label: "Subscriptions", isFeature: true },
  ];

  const secondaryMenuItems = [
    { icon: <Flame size={20} />, label: "Trending", to: "/" },
    { icon: <Radio size={20} />, label: "Live", to: "/search?q=live" },
    { icon: <History size={20} />, label: "History", isFeature: true },
    { icon: <Clock size={20} />, label: "Watch later", isFeature: true },
    { icon: <ThumbsUp size={20} />, label: "Liked videos", isFeature: true },
  ];

  const renderItem = (item, index) => {
    const isActive = item.to && location.pathname === item.to;

    const style = {
      display: "flex",
      alignItems: "center",
      gap: isOpen ? 20 : 0,
      flexDirection: isOpen ? "row" : "column",
      justifyContent: isOpen ? "flex-start" : "center",
      padding: isOpen ? "8px 12px" : "12px 0",
      borderRadius: 10,
      margin: "1px 4px",
      color: isActive ? theme.text : theme.textSecondary,
      backgroundColor: isActive ? theme.bgElevated : "transparent",
      fontWeight: isActive ? 600 : 400,
      cursor: "pointer",
      border: "none",
      background: isActive ? theme.bgElevated : "transparent",
      width: "calc(100% - 8px)",
      transition: "all 0.15s",
    };

    const hoverHandlers = {
      onMouseEnter: (e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = theme.bgHover;
          e.currentTarget.style.color = theme.text;
        }
      },
      onMouseLeave: (e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = theme.textSecondary;
        }
      },
    };

    const label = (
      <span style={{ fontSize: isOpen ? 14 : 10, marginTop: isOpen ? 0 : 4 }}>
        {item.label}
      </span>
    );

    if (item.isFeature) {
      return (
        <motion.button key={index} whileTap={{ scale: 0.95 }}
          onClick={() => toast.success(`${item.label} — synced!`, { icon: "✨" })}
          style={style} {...hoverHandlers}>
          {item.icon}{label}
        </motion.button>
      );
    }

    return (
      <Link key={index} to={item.to} style={style} {...hoverHandlers}>
        {item.icon}{label}
      </Link>
    );
  };

  return (
    <aside className="transition-all duration-200 flex-col pt-2 overflow-y-auto hidden sm:flex hide-scrollbar flex-shrink-0"
      style={{ width: isOpen ? 220 : 72, backgroundColor: theme.bg }}>
      <div style={{ borderBottom: `1px solid ${theme.borderLight}`, paddingBottom: 8, marginBottom: 4 }}>
        {menuItems.map(renderItem)}
      </div>
      <div>{secondaryMenuItems.map(renderItem)}</div>
    </aside>
  );
};

export default Sidebar;
