import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  TrendingUp, BarChart3, ListOrdered, ArrowLeft, Trophy, MapPin, Sparkles, Send, Flame, GitBranch
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Bar
} from 'recharts';

export default function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scorecard');

  // Alternate Reality State
  const [counterfactualPrompt, setCounterfactualPrompt] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [simError, setSimError] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`http://localhost:8080/api/matches/${id}`)
      .then(res => {
        setMatch(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const handleSimulateReality = (customText) => {
    const text = customText || counterfactualPrompt;
    if (!text.trim() || !id) return;

    setSimLoading(true);
    setSimError(null);

    axios.post('http://localhost:8000/analytics/simulate-scenario', {
      match_id: id,
      user_prompt: text.trim(),
      current_over: 16.0
    })
      .then(res => {
        setSimResult(res.data);
        setSimLoading(false);
      })
      .catch(err => {
        setSimError(err.response?.data?.detail || 'Simulation reasoning failed.');
        setSimLoading(false);
      });
  };

  if (loading || !match) {
    return <div className="text-center py-32 text-amber-100/40 font-mono text-xs">Loading telemetry records...</div>;
  }

  // Innings Calculation
  const computeInnings = (deliveries = [], inningsNum) => {
    const balls = deliveries.filter(d => d.inningsNumber === inningsNum);
    if (!balls.length) return null;

    let totalRuns = 0;
    let totalWickets = 0;
    const batsmanStats = {};
    const bowlerStats = {};

    balls.forEach(d => {
      totalRuns += d.runsTotal;
      if (d.isWicket) totalWickets += 1;

      if (!batsmanStats[d.batter]) {
        batsmanStats[d.batter] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: null };
      }
      batsmanStats[d.batter].runs += d.runsBatter;
      batsmanStats[d.batter].balls += 1;
      if (d.runsBatter === 4) batsmanStats[d.batter].fours += 1;
      if (d.runsBatter === 6) batsmanStats[d.batter].sixes += 1;
      if (d.isWicket && d.playerDismissed === d.batter) {
        batsmanStats[d.batter].out = `${d.dismissalKind || 'out'} b ${d.bowler}`;
      }

      if (!bowlerStats[d.bowler]) bowlerStats[d.bowler] = { runs: 0, wickets: 0, balls: 0 };
      bowlerStats[d.bowler].runs += d.runsTotal;
      bowlerStats[d.bowler].balls += 1;
      if (d.isWicket && d.dismissalKind !== 'run out') bowlerStats[d.bowler].wickets += 1;
    });

    return {
      battingTeam: balls[0].battingTeam,
      totalRuns,
      totalWickets,
      batsmanStats,
      bowlerStats
    };
  };

  const computeChartData = (deliveries = []) => {
    const inn1 = deliveries.filter(d => d.inningsNumber === 1);
    const inn2 = deliveries.filter(d => d.inningsNumber === 2);
    if (!inn1.length) return null;

    const t1 = inn1[0]?.battingTeam || 'Team 1';
    const t2 = inn2[0]?.battingTeam || 'Team 2';

    const getOvers = balls => {
      const breakdown = {};
      balls.forEach(d => {
        const ov = d.overNumber + 1;
        if (!breakdown[ov]) breakdown[ov] = 0;
        breakdown[ov] += d.runsTotal;
      });
      return breakdown;
    };

    const o1 = getOvers(inn1);
    const o2 = getOvers(inn2);
    const maxOvers = Math.max(...Object.keys(o1).map(Number), ...Object.keys(o2).map(Number), 20);

    let cum1 = 0, cum2 = 0;
    const chartData = [];
    for (let i = 1; i <= maxOvers; i++) {
      if (!o1[i] && !o2[i] && i > 15) break;
      if (o1[i]) cum1 += o1[i];
      if (o2[i]) cum2 += o2[i];
      chartData.push({
        over: `Ov ${i}`,
        [t1]: o1[i] ? cum1 : (i <= Object.keys(o1).length ? cum1 : null),
        [t2]: o2[i] ? cum2 : (i <= Object.keys(o2).length ? cum2 : null),
        [`${t1}_over`]: o1[i] || 0,
        [`${t2}_over`]: o2[i] || 0
      });
    }
    return { chartData, t1, t2 };
  };

  const innings1 = computeInnings(match.deliveries, 1);
  const innings2 = computeInnings(match.deliveries, 2);
  const charts = computeChartData(match.deliveries);

  return (
    <div className="space-y-8 py-6">
      {/* Return & Marquee Header */}
      <div>
        <Link to="/matches" className="text-xs text-amber-100/50 hover:text-amber-400 flex items-center gap-1.5 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Match Explorer
        </Link>
        <div className="bg-[#140e09] border border-[#2b1d12] rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-2">
            <span className="px-2 py-0.5 rounded bg-[#24170d] font-bold">{match.matchType}</span>
            <span>•</span>
            <span>{match.matchDate}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-[#fffbf5]">
            {match.team1} <span className="text-amber-100/30 font-normal">vs</span> {match.team2}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-amber-100/60 mt-4">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              {match.venue}, {match.city}
            </span>
            <span>•</span>
            <span>Toss: {match.tossWinner} opted to {match.tossDecision}</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">Winner: {match.winner || 'No result'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#24170d] pb-3">
        {[
          { id: 'scorecard', label: 'Scorecard', icon: ListOrdered },
          { id: 'worm', label: 'Worm Trajectory', icon: TrendingUp },
          { id: 'manhattan', label: 'Manhattan Overs', icon: BarChart3 },
          { id: 'alternate', label: 'Alternate Reality Engine', icon: GitBranch },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-amber-100/50 hover:text-[#fffbf5]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Scorecard */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6">
          {[innings1, innings2].filter(Boolean).map((inn, idx) => (
            <div key={idx} className="bg-[#140e09] border border-[#2b1d12] rounded-2xl p-6">
              <div className="flex items-center justify-between border-b border-[#24170d] pb-4 mb-4">
                <h3 className="font-bold text-[#fffbf5] text-base">{inn.battingTeam} Innings</h3>
                <span className="text-amber-400 font-mono text-base font-bold">{inn.totalRuns}/{inn.totalWickets}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-amber-100/80">
                  <thead className="text-amber-100/40 uppercase font-mono border-b border-[#24170d] pb-2 text-[10px]">
                    <tr>
                      <th className="py-2">Batter</th>
                      <th className="py-2">Dismissal</th>
                      <th className="py-2 text-right">Runs</th>
                      <th className="py-2 text-right">Balls</th>
                      <th className="py-2 text-right">4s</th>
                      <th className="py-2 text-right">6s</th>
                      <th className="py-2 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e140d]">
                    {Object.entries(inn.batsmanStats).map(([batter, st]) => (
                      <tr key={batter} className="hover:bg-[#1a120c]">
                        <td className="py-2.5 font-bold text-[#fffbf5]">{batter}</td>
                        <td className="py-2.5 text-amber-100/40">{st.out || 'not out'}</td>
                        <td className="py-2.5 text-right font-bold text-amber-400">{st.runs}</td>
                        <td className="py-2.5 text-right">{st.balls}</td>
                        <td className="py-2.5 text-right">{st.fours}</td>
                        <td className="py-2.5 text-right">{st.sixes}</td>
                        <td className="py-2.5 text-right font-mono text-orange-400">
                          {st.balls > 0 ? ((st.runs / st.balls) * 100).toFixed(1) : '0.0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Worm Chart */}
      {activeTab === 'worm' && charts && (
        <div className="bg-[#140e09] border border-[#2b1d12] rounded-2xl p-6 h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#24170d" />
              <XAxis dataKey="over" stroke="#785336" tick={{ fontSize: 11 }} />
              <YAxis stroke="#785336" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#140e09', borderColor: '#452b18', borderRadius: '8px', fontSize: '12px', color: '#fffbf5' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey={charts.t1} stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey={charts.t2} stroke="#ea580c" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* TAB 3: Manhattan Chart */}
      {activeTab === 'manhattan' && charts && (
        <div className="bg-[#140e09] border border-[#2b1d12] rounded-2xl p-6 h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#24170d" />
              <XAxis dataKey="over" stroke="#785336" tick={{ fontSize: 11 }} />
              <YAxis stroke="#785336" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#140e09', borderColor: '#452b18', borderRadius: '8px', fontSize: '12px', color: '#fffbf5' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey={`${charts.t1}_over`} name={charts.t1} fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey={`${charts.t2}_over`} name={charts.t2} fill="#ea580c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* TAB 4: Alternate Reality with 3 Twin Matches */}
      {activeTab === 'alternate' && (
        <div className="bg-[#140e09] border border-[#2b1d12] rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#fffbf5] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              The Alternate Reality Engine
            </h3>
            <p className="text-xs text-amber-100/60 mt-1">
              Type what you wished had happened. CricAI finds the 3 real matches where that scenario played out and reasons the win probability shift.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. What if they conceded only 4 runs in over 19? Or lost 2 quick wickets in over 16?"
              value={counterfactualPrompt}
              onChange={(e) => setCounterfactualPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSimulateReality()}
              className="flex-1 bg-[#0a0908] border border-[#3b2514] rounded-xl px-4 py-3 text-xs text-[#fffbf5] focus:outline-none focus:border-amber-500 placeholder-amber-100/30"
            />
            <button
              onClick={() => handleSimulateReality()}
              disabled={simLoading || !counterfactualPrompt.trim()}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 disabled:opacity-40 text-[#0a0908] px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition"
            >
              <Send className="w-3.5 h-3.5" />
              {simLoading ? 'Simulating...' : 'Simulate'}
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-2">
            {[
              "What if they lost 2 quick wickets in the 16th over?",
              "What if the death bowler conceded only 4 runs in over 19?",
              "What if the top scorer stayed not out till the end?"
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCounterfactualPrompt(chip);
                  handleSimulateReality(chip);
                }}
                className="bg-[#0a0908] border border-[#2b1d12] hover:border-amber-500/40 text-amber-100/60 hover:text-amber-300 text-[11px] px-3 py-1.5 rounded-lg transition"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Simulation Output */}
          {simResult && (
            <div className="space-y-6 pt-6 border-t border-[#24170d]">
              {/* Meters */}
              <div className="grid grid-cols-2 gap-4 bg-[#0a0908] border border-[#2b1d12] p-5 rounded-2xl">
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase">{simResult.chasing_team} Win %</div>
                  <div className="text-3xl font-black text-[#fffbf5] mt-1 flex items-baseline gap-2">
                    {simResult.simulated_win_prob}%
                    <span className="text-xs text-orange-400 font-mono">({simResult.probability_shift})</span>
                  </div>
                  <div className="w-full bg-[#24170d] h-2 rounded-full mt-3 overflow-hidden">
                    <div className="bg-amber-500 h-2 transition-all duration-500" style={{ width: `${simResult.simulated_win_prob}%` }} />
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-orange-400 uppercase">{simResult.defending_team} Win %</div>
                  <div className="text-3xl font-black text-[#fffbf5] mt-1">
                    {(100 - simResult.simulated_win_prob).toFixed(1)}%
                  </div>
                  <div className="w-full bg-[#24170d] h-2 rounded-full mt-3 overflow-hidden">
                    <div className="bg-orange-600 h-2 transition-all duration-500" style={{ width: `${100 - simResult.simulated_win_prob}%` }} />
                  </div>
                </div>
              </div>

              {/* Rationale */}
              <div className="bg-[#0a0908] border border-[#2b1d12] p-5 rounded-2xl space-y-3">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Tactical Verdict & Precedent Comparison
                </div>
                <div className="text-sm font-bold text-[#fffbf5]">"{simResult.verdict}"</div>
                <p className="text-xs text-amber-100/70 leading-relaxed">{simResult.tactical_reasoning}</p>
              </div>

              {/* The 3 Historical Precedent Twin Matches */}
              {simResult.twin_matches && simResult.twin_matches.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Top 3 Real Matches Where This Pressure State Occurred
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {simResult.twin_matches.map((twin, idx) => (
                      <div key={idx} className="bg-[#0a0908] border border-[#26180e] p-4 rounded-xl space-y-1.5">
                        <div className="text-[10px] font-mono text-amber-500 flex justify-between">
                          <span>{twin.tournament}</span>
                          <span>{twin.date}</span>
                        </div>
                        <div className="text-xs font-bold text-[#fffbf5]">{twin.fixture}</div>
                        <div className="text-[11px] text-amber-100/60 pt-1 border-t border-[#1e140d] flex justify-between">
                          <span>Target: {twin.target}</span>
                          <span className="text-amber-400 font-semibold">{twin.result_summary}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}