import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Search from "./pages/Search";
import VideoPlayer from "./pages/VideoPlayer";
import Channel from "./pages/Channel";
import Shorts from "./pages/Shorts";

function AppInner() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme } = useTheme();

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: theme.bgElevated,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: "8px",
            fontSize: "14px",
          },
        }}
      />
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/video/:id" element={<VideoPlayer />} />
            <Route path="/channel/:channelId" element={<Channel />} />
            <Route path="/shorts" element={<Shorts />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppInner />
      </Router>
    </ThemeProvider>
  );
}

export default App;
