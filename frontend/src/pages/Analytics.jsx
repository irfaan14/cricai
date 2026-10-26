import React, { useState } from 'react';
import axios from 'axios';
import {
  Users,
  Send,
  Sparkles,
  Award,
  Activity,
  Flame,
  Zap,
  Shield,
  Layers,
  Crosshair,
  TrendingUp,
  BarChart3,
  Play,
  Database
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Analytics() {
  const [playerA, setPlayerA] = useState('Jasprit Bumrah');
  const [playerB, setPlayerB] = useState('Mitchell Starc');
  const [activeWing, setActiveWing] = useState('bowling');

  // Gating State
  const [hasGenerated, setHasGenerated] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [combatStats, setCombatStats] = useState(null);

  // On-Demand Gemini RAG State
  const [ragQuery, setRagQuery] = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResponse, setRagResponse] = useState(null);

  const getInitials = (name) => {
    return (name || '')
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Configure / Generate Button Handler
  const handleGenerateDashboard = (wingToUse) => {
    const targetWing = wingToUse || activeWing;
    setStatsLoading(true);
    setRagResponse(null);

    axios.post('https://cricai-ora0.onrender.com/analytics/player-stats', {
      player_a: playerA,
      player_b: playerB,
      wing: targetWing
    })
      .then(res => {
        setCombatStats(res.data);
        setHasGenerated(true);
        setStatsLoading(false);
      })
      .catch(err => {
        console.error("Stats API error:", err);
        setHasGenerated(true);
        setStatsLoading(false);
      });
  };

  const handleWingChange = (wing) => {
    setActiveWing(wing);
    if (hasGenerated) {
      handleGenerateDashboard(wing);
    }
  };

  // 1. DYNAMIC CROSS-FORMAT TRINITY MATRIX
  const getCrossFormatData = () => {
    if (!combatStats) return [];
    const fA = combatStats.stats_a?.formats || {};
    const fB = combatStats.stats_b?.formats || {};
    return [
      { format: 'T20 & T20I', valA: Number(fA.T20 || 0), valB: Number(fB.T20 || 0) },
      { format: 'ODI (50-Over)', valA: Number(fA.ODI || 0), valB: Number(fB.ODI || 0) },
      { format: 'Test Matches', valA: Number(fA.Test || 0), valB: Number(fB.Test || 0) },
    ];
  };

  // 2. OVER-BY-OVER PROGRESSION TRAJECTORY
  const getProgressionCurve = () => {
    if (!combatStats) return [];
    const pA = combatStats.stats_a?.progression_curve || {};
    const pB = combatStats.stats_b?.progression_curve || {};
    const buckets = ['Ov 1–3', 'Ov 4–6', 'Ov 7–11', 'Ov 12–15', 'Ov 16–18', 'Ov 19–20'];

    return buckets.map(bucket => ({
      over: bucket,
      valA: Number(pA[bucket] || 0),
      valB: Number(pB[bucket] || 0)
    }));
  };

  // 3. HEXAGONAL SKILL ATTRIBUTE RADAR
  const getRadarData = () => {
    if (!combatStats) return [];
    const rA = combatStats.stats_a?.radar || {};
    const rB = combatStats.stats_b?.radar || {};

    const keys = Object.keys(rA).length > 0 ? Object.keys(rA) : [];
    return keys.map(attr => ({
      attribute: attr,
      valA: Number(rA[attr] || 50),
      valB: Number(rB[attr] || 50)
    }));
  };

  // 4. PHASE WICKET / RUN CONTRIBUTION SHARE
  const getPhaseShare = () => {
    if (!combatStats) return [];
    const sA = combatStats.stats_a?.phase_share || { Powerplay: 33, Middle: 33, Death: 34 };
    const sB = combatStats.stats_b?.phase_share || { Powerplay: 33, Middle: 33, Death: 34 };

    return [
      { name: playerA, Powerplay: Number(sA.Powerplay || 0), Middle: Number(sA.Middle || 0), Death: Number(sA.Death || 0) },
      { name: playerB, Powerplay: Number(sB.Powerplay || 0), Middle: Number(sB.Middle || 0), Death: Number(sB.Death || 0) },
    ];
  };

  // 5. PIE CHARTS
  const pieDataA = combatStats?.stats_a?.pie_data?.length > 0
    ? combatStats.stats_a.pie_data.filter(item => item.value > 0)
    : [{ name: 'No Events', value: 1, color: '#452b18' }];

  const pieDataB = combatStats?.stats_b?.pie_data?.length > 0
    ? combatStats.stats_b.pie_data.filter(item => item.value > 0)
    : [{ name: 'No Events', value: 1, color: '#452b18' }];

  // Head-to-Head HUD Cards (Adapted per Wing)
  const getTaleOfTheTape = () => {
    const sA = combatStats?.stats_a || {};
    const sB = combatStats?.stats_b || {};

    if (activeWing === 'bowling') {
      return [
        { label: 'Overall Economy', valA: sA.overall_economy ?? '0.00', valB: sB.overall_economy ?? '0.00', note: 'Runs/Over' },
        { label: 'Wicket Strike Rate', valA: sA.strike_rate ?? '0.0', valB: sB.strike_rate ?? '0.0', note: 'Balls/Wkt' },
        { label: 'Death Overs Economy', valA: sA.death_economy ?? '0.00', valB: sB.death_economy ?? '0.00', note: 'Ov 16–20' },
        { label: 'Dot Ball Rate', valA: sA.dot_pct || '0.0%', valB: sB.dot_pct || '0.0%', note: 'Dot %' },
      ];
    } else if (activeWing === 'fielding') {
      return [
        { label: 'Career Catches', valA: sA.catches ?? '0', valB: sB.catches ?? '0', note: 'All Formats' },
        { label: 'Run-Out Assists', valA: sA.run_outs ?? '0', valB: sB.run_outs ?? '0', note: 'Direct Hits' },
        { label: 'Catch-to-Dismissal Index', valA: `${((Number(sA.catches || 0) / Math.max(1, Number(sA.catches || 0) + Number(sA.run_outs || 0))) * 100).toFixed(0)}%`, valB: `${((Number(sB.catches || 0) / Math.max(1, Number(sB.catches || 0) + Number(sB.run_outs || 0))) * 100).toFixed(0)}%`, note: 'Share' },
        { label: 'Fielding Involvements', valA: (Number(sA.catches || 0) + Number(sA.run_outs || 0)).toString(), valB: (Number(sB.catches || 0) + Number(sB.run_outs || 0)).toString(), note: 'Total Dismissals' },
      ];
    } else {
      return [
        { label: 'Career Average', valA: sA.overall_average ?? '0.0', valB: sB.overall_average ?? '0.0', note: 'Runs/Dismissal' },
        { label: 'Strike Rate', valA: sA.strike_rate ?? '0.0', valB: sB.strike_rate ?? '0.0', note: 'Runs/100b' },
        { label: 'Boundary %', valA: sA.boundary_pct || '0.0%', valB: sB.boundary_pct || '0.0%', note: 'Boundary Share' },
        { label: 'Chase Index', valA: sA.chase_index ?? '0.0', valB: sB.chase_index ?? '0.0', note: '2nd Inn Impact' },
      ];
    }
  };

  const handleRagQuery = (overridePrompt) => {
    const text = overridePrompt || ragQuery;
    if (!text.trim()) return;

    setRagLoading(true);
    axios.post('https://cricai-ora0.onrender.com/analytics/simulate-scenario', {
      user_prompt: `[Multi-Format Player Radar] Comparing ${playerA} vs ${playerB} across T20, ODI, and Test. Wing: ${activeWing}. Analytical question: ${text}`
    })
      .then(res => {
        setRagResponse(res.data);
        setRagLoading(false);
      })
      .catch(err => {
        console.error(err);
        setRagLoading(false);
      });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div className="border-b border-[#24170d] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c130b] border border-amber-500/20 text-amber-400 text-xs font-mono mb-2">
          <Crosshair className="w-3.5 h-3.5 text-amber-500" />
          Dual-Layer PostgreSQL Telemetry HUD
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-[#fffbf5] tracking-tight">
          PLAYER COMBAT RADAR
        </h1>
        <p className="text-xs text-amber-100/60 mt-1">
          Career summary matrix combined with raw Cricsheet deliveries across over phases and dismissal distributions.
        </p>
      </div>

      {/* COMBAT CONFIGURATOR & GENERATE BUTTON BOX */}
      <div className="bg-[#140e09] border border-[#2b1d12] p-6 md:p-8 rounded-3xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-4">
          {/* Player A Input */}
          <div className="md:col-span-2 flex items-center gap-4 bg-[#0a0908] border border-amber-500/30 p-4 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-black text-[#0a0908] text-base font-mono shadow-lg">
              {getInitials(playerA)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider block">Player A</span>
                {combatStats?.stats_a?.canonical_name && (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" />
                    DB: {combatStats.stats_a.canonical_name}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={playerA}
                onChange={e => setPlayerA(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerateDashboard()}
                className="w-full bg-transparent border-b border-[#3b2514] text-base text-[#fffbf5] font-bold py-0.5 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* VS Divider */}
          <div className="md:col-span-1 flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-[#24170d] border border-amber-500/40 flex items-center justify-center font-black text-amber-400 font-mono text-xs">
              VS
            </div>
          </div>

          {/* Player B Input */}
          <div className="md:col-span-2 flex items-center gap-4 bg-[#0a0908] border border-orange-500/30 p-4 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-600 to-red-500 flex items-center justify-center font-black text-[#fffbf5] text-base font-mono shadow-lg">
              {getInitials(playerB)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-orange-400 tracking-wider block">Player B</span>
                {combatStats?.stats_b?.canonical_name && (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Database className="w-2.5 h-2.5" />
                    DB: {combatStats.stats_b.canonical_name}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={playerB}
                onChange={e => setPlayerB(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerateDashboard()}
                className="w-full bg-transparent border-b border-[#3b2514] text-base text-[#fffbf5] font-bold py-0.5 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Wing Switcher & Primary Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#24170d]">
          <div className="flex gap-2">
            {[
              { id: 'bowling', label: 'Bowling Suite', icon: Zap },
              { id: 'batting', label: 'Batting Suite', icon: Flame },
              { id: 'fielding', label: 'Fielding Suite', icon: Shield },
            ].map(wing => {
              const Icon = wing.icon;
              return (
                <button
                  key={wing.id}
                  onClick={() => handleWingChange(wing.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    activeWing === wing.id
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-[#0a0908] shadow-lg shadow-orange-950/40'
                      : 'bg-[#0a0908] border border-[#24170d] text-amber-100/50 hover:text-[#fffbf5]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {wing.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handleGenerateDashboard()}
            disabled={statsLoading || !playerA.trim() || !playerB.trim()}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 disabled:opacity-40 text-[#0a0908] font-black px-8 py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-[#0a0908]" />
            {statsLoading ? 'Scanning Dual-Layer Databases...' : 'Generate Combat Dashboard'}
          </button>
        </div>
      </div>

      {/* GATED DASHBOARD */}
      {hasGenerated && (
        <div className="space-y-8 animate-fade-in">
          {/* TALE OF THE TAPE STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {getTaleOfTheTape().map((item, idx) => (
              <div key={idx} className="bg-[#140e09] border border-[#2b1d12] p-4 rounded-2xl space-y-1">
                <div className="flex justify-between text-[10px] font-mono uppercase text-amber-100/40">
                  <span>{item.label}</span>
                  <span>{item.note}</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xl font-black font-mono text-amber-400">{item.valA}</span>
                  <span className="text-[10px] text-amber-100/30 font-mono">VS</span>
                  <span className="text-xl font-black font-mono text-orange-400">{item.valB}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ROW 1: CROSS-FORMAT TRINITY MATRIX & RADAR HEXAGON */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Trinity Matrix */}
            <div className="bg-[#140e09] border border-[#2b1d12] p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#24170d] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-500" />
                    Cross-Format Trinity Matrix (T20 vs ODI vs Test)
                  </h3>
                  <p className="text-[11px] text-amber-100/50 mt-0.5">
                    Direct comparison across all 3 international formats.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#24170d] text-amber-300">
                  {activeWing === 'bowling' ? 'Bowling Avg' : activeWing === 'fielding' ? 'Total Catches' : 'Strike Rate'}
                </span>
              </div>

              <div className="w-full h-[320px] min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getCrossFormatData()} margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#24170d" />
                    <XAxis dataKey="format" stroke="#a37651" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#785336" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#140e09', borderColor: '#452b18', borderRadius: '8px', fontSize: '11px', color: '#fffbf5' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#fffbf5' }} />
                    <Bar name={playerA} dataKey="valA" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={26} />
                    <Bar name={playerB} dataKey="valB" fill="#ea580c" radius={[6, 6, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Skill Radar Hexagon */}
            <div className="bg-[#140e09] border border-[#2b1d12] p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#24170d] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-500" />
                    Skill Attribute Hexagon ({activeWing.toUpperCase()})
                  </h3>
                  <p className="text-[11px] text-amber-100/50 mt-0.5">
                    Multi-axis radar comparing pressure execution and technical mastery.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-amber-100/50">Normalized 0–100</span>
              </div>

              <div className="w-full h-[320px] min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData()}>
                    <PolarGrid stroke="#2b1d12" />
                    <PolarAngleAxis dataKey="attribute" stroke="#a37651" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis stroke="#4a301a" angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name={playerA} dataKey="valA" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                    <Radar name={playerB} dataKey="valB" stroke="#ea580c" fill="#ea580c" fillOpacity={0.4} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#fffbf5' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#140e09', borderColor: '#452b18', borderRadius: '8px', fontSize: '11px', color: '#fffbf5' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ROW 2: PROGRESSION AREA TRAJECTORY & PHASE BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 3: Progression Curve */}
            <div className="lg:col-span-2 bg-[#140e09] border border-[#2b1d12] p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#24170d] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    Innings Phase Progression Curve (Overs 1 to 20)
                  </h3>
                  <p className="text-[11px] text-amber-100/50 mt-0.5">
                    {activeWing === 'bowling' ? 'Economy control progression across phases' : 'Scoring acceleration progression'}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-amber-100/50">PP ➔ Mid ➔ Death</span>
              </div>

              <div className="w-full h-[300px] min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getProgressionCurve()} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="gradPlayerA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="gradPlayerB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#24170d" />
                    <XAxis dataKey="over" stroke="#a37651" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#785336" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#140e09', borderColor: '#452b18', borderRadius: '8px', fontSize: '11px', color: '#fffbf5' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#fffbf5' }} />
                    <Area name={playerA} type="monotone" dataKey="valA" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#gradPlayerA)" />
                    <Area name={playerB} type="monotone" dataKey="valB" stroke="#ea580c" strokeWidth={2.5} fillOpacity={1} fill="url(#gradPlayerB)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Phase Share */}
            <div className="lg:col-span-1 bg-[#140e09] border border-[#2b1d12] p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#24170d] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-500" />
                    {activeWing === 'bowling' ? 'Phase Wicket Share %' : 'Phase Scoring Share %'}
                  </h3>
                  <p className="text-[11px] text-amber-100/50 mt-0.5">Where is the impact generated?</p>
                </div>
                <span className="text-[10px] font-mono text-amber-100/50">100% Stacked</span>
              </div>

              <div className="w-full h-[300px] min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getPhaseShare()} layout="vertical" margin={{ left: -10, right: 10, top: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#24170d" />
                    <XAxis type="number" domain={[0, 100]} stroke="#785336" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" stroke="#a37651" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip contentStyle={{ backgroundColor: '#140e09', borderColor: '#452b18', borderRadius: '8px', fontSize: '11px', color: '#fffbf5' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#fffbf5' }} />
                    <Bar dataKey="Powerplay" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="Middle" stackId="a" fill="#ea580c" />
                    <Bar dataKey="Death" stackId="a" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ROW 3: CONDITIONAL PIE CHARTS */}
          <div className="bg-[#140e09] border border-[#2b1d12] p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#24170d] pb-3">
              <div>
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-orange-500" />
                  {activeWing === 'bowling'
                    ? 'Mode of Dismissal Proportions (Caught vs Bowled vs LBW)'
                    : activeWing === 'fielding'
                    ? 'Fielding Dismissal Breakdown (Catches vs Run Outs vs Stumpings)'
                    : 'Boundary Run Distribution (1s vs 4s vs 6s)'}
                </h3>
                <p className="text-[11px] text-amber-100/50 mt-0.5">Categorical distribution share.</p>
              </div>
              <span className="text-[10px] font-mono text-amber-100/50">Categorical Share</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0a0908] border border-[#24170d] p-4 rounded-2xl flex flex-col items-center">
                <div className="text-xs font-bold text-amber-400 mb-2 font-mono">{playerA}</div>
                <div className="w-full h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieDataA} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={60} paddingAngle={4}>
                        {pieDataA.map((entry, idx) => (
                          <Cell key={`cell-a-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#140e09', borderColor: '#452b18', fontSize: '11px', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', color: '#fffbf5' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#0a0908] border border-[#24170d] p-4 rounded-2xl flex flex-col items-center">
                <div className="text-xs font-bold text-orange-400 mb-2 font-mono">{playerB}</div>
                <div className="w-full h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieDataB} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={60} paddingAngle={4}>
                        {pieDataB.map((entry, idx) => (
                          <Cell key={`cell-b-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#140e09', borderColor: '#452b18', fontSize: '11px', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', color: '#fffbf5' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 4: ON-DEMAND GEMINI ORACLE */}
          <div className="bg-[#140e09] border border-[#2b1d12] p-6 rounded-3xl space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#fffbf5] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Query Deep Multi-Format Career Archives
              </h2>
              <p className="text-xs text-amber-100/50 mt-1">
                Consult Gemini RAG for narrative context, head-to-head records, and historical match-ups.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`e.g. Compare ${playerA} vs ${playerB} death overs economy and strike rate in T20 chases.`}
                value={ragQuery}
                onChange={e => setRagQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRagQuery()}
                className="flex-1 bg-[#0a0908] border border-[#3b2514] rounded-xl px-4 py-3 text-xs text-[#fffbf5] focus:outline-none focus:border-amber-500 placeholder-amber-100/30"
              />
              <button
                onClick={() => handleRagQuery()}
                disabled={ragLoading || !ragQuery.trim()}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 disabled:opacity-40 text-[#0a0908] px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-orange-950/40 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 fill-[#0a0908]" />
                {ragLoading ? 'Consulting DB...' : 'Ask Oracle'}
              </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap gap-2">
              {[
                `Compare ${playerA} vs ${playerB} death overs economy in T20s`,
                `Who has higher wicket conversion rate in powerplay?`,
                `Compare career economy and average across all formats`
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setRagQuery(chip);
                    handleRagQuery(chip);
                  }}
                  className="bg-[#0a0908] border border-[#2b1d12] hover:border-amber-500/40 text-amber-100/60 hover:text-amber-300 text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* RAG Verdict */}
            {ragResponse && (
              <div className="bg-[#0a0908] border border-amber-500/30 p-6 rounded-2xl space-y-4 mt-4 animate-fade-in shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#24170d] pb-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Award className="w-4 h-4 text-orange-400" />
                    <span>RAG Intelligence Verdict</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#24170d] text-amber-300 font-bold">
                    {activeWing.toUpperCase()} Analysis
                  </span>
                </div>

                <div className="text-base font-bold text-[#fffbf5] leading-snug">
                  "{ragResponse.verdict}"
                </div>

                <p className="text-xs text-amber-100/70 leading-relaxed whitespace-pre-line">
                  {ragResponse.tactical_reasoning}
                </p>

                {ragResponse.key_factors && (
                  <div className="space-y-2 pt-3 border-t border-[#24170d]">
                    <div className="text-[11px] font-mono uppercase text-amber-400 tracking-wider">
                      Key Statistical Takeaways
                    </div>
                    <ul className="space-y-1">
                      {ragResponse.key_factors.map((item, idx) => (
                        <li key={idx} className="text-xs text-amber-100/60 flex items-start gap-2">
                          <span className="text-orange-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}