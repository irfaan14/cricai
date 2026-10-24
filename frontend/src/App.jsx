import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import Simulator from './pages/Simulator';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a0908] text-[#fffbf5] flex flex-col font-sans selection:bg-amber-500 selection:text-[#0a0908]">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/matches/:id" element={<MatchDetail />} />
            <Route path="/sandbox" element={<Simulator />} />
            <Route path="/players" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}