import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Flame,
  Send,
  Sparkles,
  Trophy,
  Cpu,
  Users,
  ChevronDown,
  ArrowRight,
  Database
} from 'lucide-react';

export default function Home() {
  const [ragPrompt, setRagPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [ragResult, setRagResult] = useState(null);

  const executeRAGQuery = (customQuery) => {
    const text = customQuery || ragPrompt;
    if (!text.trim()) return;

    setLoading(true);
    axios.post('https://cricai-ora0.onrender.com/analytics/simulate-scenario', {
      user_prompt: text.trim()
    })
      .then(res => {
        setRagResult(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('RAG Query Error:', err);
        setLoading(false);
      });
  };

  const scrollToCards = () => {
    const element = document.getElementById('platform-features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-24">
      {/* 100vh Hero Section */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between py-8">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-gradient-to-tr from-amber-600/15 via-orange-600/15 to-red-600/5 blur-[120px] pointer-events-none -z-10 rounded-full" />

        <div className="max-w-4xl mx-auto w-full text-center space-y-6 pt-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1c130b] border border-amber-500/30 text-amber-400 text-xs font-mono tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Multi-Format Knowledge RAG + XGBoost Engine
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#fffbf5] leading-tight">
            CRICKET STRATEGY, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
              RE-ENGINEERED.
            </span>
          </h1>

          <p className="text-amber-100/60 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Query career records, strike rates, and multi-format averages with our database RAG intelligence, or simulate real-time tactical leverage shifts using calibrated machine learning.
          </p>

          {/* Responsive Search Input Container */}
          <div className="max-w-3xl mx-auto pt-4 space-y-4 text-left">
            <div className="bg-[#140e09]/95 border border-[#2b1d12] focus-within:border-amber-500/60 p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/80 transition duration-200">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <Flame className="w-5 h-5 text-amber-500 flex-shrink-0 ml-2 mr-2" />
                  <input
                    type="text"
                    placeholder="Ask tactical match questions, scenario shifts, or multi-format stats..."
                    value={ragPrompt}
                    onChange={(e) => setRagPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeRAGQuery()}
                    className="w-full bg-transparent text-xs sm:text-sm text-[#fffbf5] placeholder-amber-100/30 py-2 sm:py-2.5 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => executeRAGQuery()}
                  disabled={loading || !ragPrompt.trim()}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-[#0a0908] font-black text-xs px-5 sm:px-6 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#0a0908] border-t-transparent rounded-full animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 fill-[#0a0908]" />
                      <span>Analyze Scenario</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Prompt Quick Chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Who is the leading Indian bowler across all formats?",
                "What is Jasprit Bumrah death overs economy in T20s?",
                "Who has the highest strike rate for Australia?"
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setRagPrompt(chip);
                    executeRAGQuery(chip);
                  }}
                  className="bg-[#140e09] border border-[#2b1d12] hover:border-amber-500/40 text-amber-100/60 hover:text-amber-300 text-[11px] px-3.5 py-1.5 rounded-lg transition text-left cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Compact RAG Answer Display Card */}
            {ragResult && (
              <div className="bg-[#140e09] border border-amber-500/30 p-5 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3 mt-5 animate-fade-in shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#24170d] pb-2.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span>Tactical Intelligence Verdict</span>
                  </div>
                  {ragResult.has_db_context ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold flex items-center gap-1">
                      <Database className="w-2.5 h-2.5" />
                      DB Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-500/20 text-amber-300 font-bold">
                      Global Archive
                    </span>
                  )}
                </div>

                {/* 1. Bold Direct Answer */}
                <div className="text-base sm:text-lg font-bold text-amber-300 leading-snug tracking-tight">
                  {ragResult.direct_answer || ragResult.verdict}
                </div>

                {/* 2. Short Tactical Explanation Below */}
                {(ragResult.short_explanation || (ragResult.markdown_verdict && ragResult.markdown_verdict !== ragResult.direct_answer)) && (
                  <p className="text-xs sm:text-sm text-amber-100/75 leading-relaxed pt-2.5 border-t border-[#24170d]/80 font-sans">
                    {ragResult.short_explanation || ragResult.markdown_verdict}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="flex flex-col items-center gap-2 text-center pb-2 cursor-pointer group" onClick={scrollToCards}>
          <span className="text-[11px] font-mono tracking-widest uppercase text-amber-100/40 group-hover:text-amber-400 transition">
            Explore Capabilities
          </span>
          <ChevronDown className="w-4 h-4 text-amber-500 animate-bounce" />
        </div>
      </section>

      {/* Feature Cards Strip */}
      <section id="platform-features" className="space-y-8 scroll-mt-24">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-[#fffbf5] tracking-tight">
            ENGINEERED MODULES
          </h2>
          <p className="text-xs text-amber-100/50">
            Tailored analytics workspaces designed for deep game comprehension.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Matches & Alternate Realities */}
          <Link
            to="/matches"
            className="group bg-[#140e09] border border-[#2b1d12] hover:border-amber-500/40 rounded-3xl p-7 transition flex flex-col justify-between hover:bg-[#1a120c]"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#26170d] border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#fffbf5] group-hover:text-amber-400 transition">
                Match Telemetry & Alternate Reality
              </h3>
              <p className="text-xs text-amber-100/60 leading-relaxed">
                Filter by Format, Year, and Teams. Inspect Worm/Manhattan charts and inject "What-If" moments benchmarked against the 3 closest historical matches.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500 pt-6 mt-4 border-t border-[#24170d]">
              <span>Explore Fixtures</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Custom Sandbox */}
          <Link
            to="/sandbox"
            className="group bg-[#140e09] border border-[#2b1d12] hover:border-orange-500/40 rounded-3xl p-7 transition flex flex-col justify-between hover:bg-[#1a120c]"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#26170d] border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#fffbf5] group-hover:text-orange-400 transition">
                Custom Match Sandbox
              </h3>
              <p className="text-xs text-amber-100/60 leading-relaxed">
                Design custom chase scenarios from scratch. Configure target, current runs, overs, and wickets to predict win probability with historical parallels.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-500 pt-6 mt-4 border-t border-[#24170d]">
              <span>Launch Sandbox</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Player Radar */}
          <Link
            to="/players"
            className="group bg-[#140e09] border border-[#2b1d12] hover:border-red-500/40 rounded-3xl p-7 transition flex flex-col justify-between hover:bg-[#1a120c]"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#26170d] border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#fffbf5] group-hover:text-red-400 transition">
                Format-by-Format Player Radar
              </h3>
              <p className="text-xs text-amber-100/60 leading-relaxed">
                Compare any two cricketers side-by-side across T20, ODI, Test, and franchise formats. Inspect head-to-head match-ups, strike rates, and fielding stats.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-500 pt-6 mt-4 border-t border-[#24170d]">
              <span>Compare Players</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* Platform Telemetry Footer */}
      <footer className="border-t border-[#24170d] pt-10 pb-8 flex flex-col md:flex-row items-center justify-between text-xs text-amber-100/40 gap-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-[#fffbf5]">CRICAI Analytics Suite</span>
          <span>•</span>
          <span>XGBoost Multi-Format Chase Calibration</span>
        </div>
        <div className="flex items-center gap-6 font-mono text-[11px]">
          <span>Archive: 600,000+ Deliveries</span>
          <span>RAG: Gemini 2.5 Flash</span>
          <span>Engine: FastAPI + PostgreSQL</span>
        </div>
      </footer>
    </div>
  );
}