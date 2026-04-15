import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, Video, Bell, User, Play, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useTheme } from "../context/ThemeContext";

const Navbar = ({ toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const { theme, themeKey, toggleTheme } = useTheme();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const IconBtn = ({ onClick, children, accent }) => (
    <motion.button whileTap={{ scale: 0.9 }} onClick={onClick}
      className="p-2 rounded-full transition-colors"
      style={{ color: accent || theme.text }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgElevated}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
      {children}
    </motion.button>
  );

  return (
    <nav className="flex items-center justify-between px-3 sm:px-5 h-14 sticky top-0 z-50 transition-colors"
      style={{ backgroundColor: theme.bg, borderBottom: `1px solid ${theme.borderLight}` }}>
      <div className="flex items-center gap-3">
        <IconBtn onClick={toggleSidebar}><Menu size={20} /></IconBtn>
        <Link to="/" className="flex items-center gap-1.5">
          <div className="rounded-lg p-1" style={{ backgroundColor: theme.accentRed }}>
            <Play size={16} className="text-white" fill="white" />
          </div>
          <span className="text-[17px] font-bold tracking-tight hidden sm:block" style={{ color: theme.text }}>PlayTube</span>
        </Link>
      </div>

      <div className="flex-1 max-w-[560px] mx-4 sm:mx-8">
        <form onSubmit={handleSearch} className="flex items-center">
          <input type="text" placeholder="Search" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 rounded-l-full px-4 py-[6px] text-sm outline-none transition-all"
            style={{
              backgroundColor: theme.bgInput,
              border: `1px solid ${searchFocused ? theme.accent : theme.border}`,
              color: theme.text,
              boxShadow: searchFocused ? `inset 0 1px 4px ${theme.shadow}` : "none",
            }} />
          <button type="submit" className="px-5 py-[6px] rounded-r-full transition-colors"
            style={{ backgroundColor: theme.bgElevated, border: `1px solid ${theme.border}`, borderLeft: "none" }}>
            <Search size={18} style={{ color: theme.textSecondary }} />
          </button>
        </form>
      </div>

      <div className="flex items-center gap-0.5">
        <IconBtn onClick={toggleTheme}>
          {themeKey === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </IconBtn>
        <IconBtn onClick={() => toast("Create", { icon: "🎬" })}><Video size={20} /></IconBtn>
        <IconBtn onClick={() => toast("Notifications", { icon: "🔔" })}><Bell size={20} /></IconBtn>
        <IconBtn onClick={() => toast("Profile", { icon: "👤" })} accent={theme.accent}><User size={20} /></IconBtn>
      </div>
    </nav>
  );
};

export default Navbar;
