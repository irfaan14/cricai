import React, { useState } from 'react';
import axios from 'axios';
import { Cpu, Send, Sparkles, AlertCircle, Play, History, ArrowDown } from 'lucide-react';

export default function Simulator() {
  // Configuration State
  const [format, setFormat] = useState('T20');
  const [division, setDivision] = useState('MEN');
  const [chasingTeam, setChasingTeam] = useState('India');
  const [defendingTeam, setDefendingTeam] = useState('Australia');

  const [target, setTarget] = useState(180);
  const [currentRuns, setCurrentRuns] = useState(132);
  const [currentWickets, setCurrentWickets] = useState(4);
  const [currentOver, setCurrentOver] = useState(15.4);

  // Stage 1 State: Baseline & Twin Matches
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [baselineData, setBaselineData] = useState(null);

  // Stage 2 State: What-If Counterfactual
  const [scenarioPrompt, setScenarioPrompt] = useState('');
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [error, setError] = useState(null);

  const nations = [
    'India', 'Australia', 'England', 'Pakistan', 'South Africa',
    'New Zealand', 'West Indies', 'Sri Lanka', 'Bangladesh', 'Afghanistan'
  ];

  // Stage 1: Configure & Fetch Nearest Matches
  const handleConfigure = () => {
    setBaselineLoading(true);
    setError(null);
    setWhatIfResult(null);

    axios.post('http://localhost:8000/analytics/sandbox-baseline', {
      format,
      division,
      chasing_team: chasingTeam,
      defending_team: defendingTeam,
      target: parseInt(target, 10),
      current_runs: parseInt(currentRuns, 10),
      current_wickets: parseInt(currentWickets, 10),
      current_over: parseFloat(currentOver)
    })
      .then(res => {
        setBaselineData(res.data);
        setBaselineLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.detail || 'Failed to configure baseline. Verify FastAPI is running.');
        setBaselineLoading(false);
      });
  };

  // Stage 2: What-If Alternate Reality
  const handleWhatIf = (overridePrompt) => {
    const promptText = overridePrompt || scenarioPrompt;
    if (!promptText.trim()) return;

    setWhatIfLoading(true);
    setError(null);

    axios.post('http://localhost:8000/analytics/sandbox-whatif', {
      baseline: {
        format,
        division,
        chasing_team: chasingTeam,
        defending_team: defendingTeam,
        target: parseInt(target, 10),
        current_runs: parseInt(currentRuns, 10),
        current_wickets: parseInt(currentWickets, 10),
        current_over: parseFloat(currentOver)
      },
      what_if_prompt: promptText
    })
      .then(res => {
        setWhatIfResult(res.data);
        setWhatIfLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.detail || 'What-If reasoning failed.');
        setWhatIfLoading(false);
      });
  };

  const runsNeeded = Math.max(0, target - currentRuns);
  const totalOvers = format === 'ODI' ? 50 : 20;
  const totalBalls = totalOvers * 6;
  const ballsRemaining = Math.max(1, totalBalls - (Math.floor(currentOver) * 6 + Math.round((currentOver % 1) * 10)));
  const rrr = ((runsNeeded / ballsRemaining) * 6).toFixed(2);
  const crr = currentOver > 0 ? (currentRuns / currentOver).toFixed(2) : '0.00';

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div className="border-b border-[#24170d] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c130b] border border-orange-500/20 text-orange-400 text-xs font-mono mb-2">
          <Cpu className="w-3.5 h-3.5 text-orange-500" />
          Predictive Machine Learning Workbench
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-[#fffbf5]">
          Custom Match Sandbox
        </h1>
        <p className="text-xs text-amber-100/60 mt-1">
          Configure a blank-slate chase situation to calculate baseline metrics and retrieve historical twin matches, then explore alternate reality scenarios.
        </p>
      </div>

      {/* STAGE 1: Match Configurator Box */}
      <div className="bg-[#140e09] border border-[#2b1d12] p-6 rounded-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-[#24170d] pb-3">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Play className="w-4 h-4 text-orange-500" />
            1. Configuration & Initial Benchmark
          </h2>
          <span className="text-[11px] font-mono text-amber-100/50">Setup Chase Conditions</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-mono text-amber-100/50 uppercase">Division</label>
            <select
              value={division}
              onChange={e => setDivision(e.target.value)}
              className="w-full bg-[#0a0908] border border-[#3b2514] text-xs text-[#fffbf5] rounded-xl p-2.5 mt-1 focus:border-amber-500 focus:outline-none"
            >
              <option value="MEN">Men's Cricket</option>
              <option value="WOMEN">Women's Cricket</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-amber-100/50 uppercase">Format</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value)}
              className="w-full bg-[#0a0908] border border-[#3b2514] text-xs text-[#fffbf5] rounded-xl p-2.5 mt-1 focus:border-amber-500 focus:outline-none"
            >
              <option value="T20">T20 (20 Overs)</option>
              <option value="ODI">ODI (50 Overs)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-amber-100/50 uppercase">Chasing Team</label>
            <select
              value={chasingTeam}
              onChange={e => setChasingTeam(e.target.value)}
              className="w-full bg-[#0a0908] border border-[#3b2514] text-xs text-[#fffbf5] rounded-xl p-2.5 mt-1 focus:border-amber-500 focus:outline-none"
            >
              {nations.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-amber-100/50 uppercase">Defending Team</label>
            <select
              value={defendingTeam}
              onChange={e => setDefendingTeam(e.target.value)}
              className="w-full bg-[#0a0908] border border-[#3b2514] text-xs text-[#fffbf5] rounded-xl p-2.5 mt-1 focus:border-amber-500 focus:outline-none"
            >
              {nations.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Sliders and Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div>
            <div className="flex justify-between text-xs text-amber-100/70 mb-1">
              <span>Target Runs</span>
              <span className="font-mono font-bold text-amber-400">{target}</span>
            </div>
            <input
              type="range" min="80" max={format === 'ODI' ? 380 : 250} value={target}
              onChange={e => setTarget(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-mono text-amber-100/50 uppercase">Current Runs</label>
              <input
                type="number" value={currentRuns}
                onChange={e => setCurrentRuns(Number(e.target.value))}
                className="w-full bg-[#0a0908] border border-[#3b2514] text-xs text-[#fffbf5] rounded-xl p-2 mt-1 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-amber-100/50 uppercase">Wickets Lost</label>
              <input
                type="number" min="0" max="9" value={currentWickets}
                onChange={e => setCurrentWickets(Number(e.target.value))}
                className="w-full bg-[#0a0908] border border-[#3b2514] text-xs text-[#fffbf5] rounded-xl p-2 mt-1 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-amber-100/70 mb-1">
              <span>Overs Completed</span>
              <span className="font-mono font-bold text-orange-400">{currentOver} ov</span>
            </div>
            <input
              type="range" min="1.0" max={format === 'ODI' ? 49.5 : 19.5} step="0.1" value={currentOver}
              onChange={e => setCurrentOver(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
          </div>
        </div>

        {/* Telemetry Indicator & Configure Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#24170d]">
          <div className="flex items-center gap-6 font-mono text-xs">
            <div>Required: <span className="text-amber-400 font-bold">{runsNeeded}</span> off <span className="text-amber-400 font-bold">{ballsRemaining}</span>b</div>
            <div>RRR: <span className="text-orange-400 font-bold">{rrr}</span></div>
            <div>CRR: <span className="text-amber-400 font-bold">{crr}</span></div>
          </div>

          <button
            onClick={handleConfigure}
            disabled={baselineLoading}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 disabled:opacity-40 text-[#0a0908] font-bold px-8 py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition"
          >
            <Play className="w-3.5 h-3.5 fill-[#0a0908]" />
            {baselineLoading ? 'Analyzing DB & Model...' : 'Configure Match State'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 p-4 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STAGE 1 RESULT: Baseline Stats & Top 3 Nearest Matches */}
      {baselineData && (
        <div className="space-y-6 animate-fade-in">
          {/* Baseline Win Probability Card */}
          <div className="bg-[#140e09] border border-[#2b1d12] p-6 rounded-3xl space-y-4">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Baseline Machine Learning Prediction
            </div>

            <div className="grid grid-cols-2 gap-4 bg-[#0a0908] border border-[#2b1d12] p-5 rounded-2xl">
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase">{baselineData.chasing_team} Win %</div>
                <div className="text-4xl font-black text-[#fffbf5] mt-1">{baselineData.base_win_prob}%</div>
                <div className="w-full bg-[#24170d] h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-amber-500 h-2 transition-all duration-500" style={{ width: `${baselineData.base_win_prob}%` }} />
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-orange-400 uppercase">{baselineData.defending_team} Win %</div>
                <div className="text-4xl font-black text-[#fffbf5] mt-1">
                  {(100 - baselineData.base_win_prob).toFixed(1)}%
                </div>
                <div className="w-full bg-[#24170d] h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-orange-600 h-2 transition-all duration-500" style={{ width: `${100 - baselineData.base_win_prob}%` }} />
                </div>
              </div>
            </div>

            {/* Baseline Tactical Analysis Description (Gemini) */}
            {baselineData.tactical_reasoning && (
              <div className="bg-[#0a0908] border border-[#26180e] p-5 rounded-2xl space-y-3 mt-4">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Baseline Situation Analysis & Historical Precedent
                </div>
                {baselineData.verdict && (
                  <div className="text-sm font-bold text-[#fffbf5]">"{baselineData.verdict}"</div>
                )}
                <p className="text-xs text-amber-100/70 leading-relaxed">
                  {baselineData.tactical_reasoning}
                </p>
                {baselineData.key_factors && baselineData.key_factors.length > 0 && (
                  <ul className="space-y-1 pt-3 border-t border-[#1e140d]">
                    {baselineData.key_factors.map((factor, idx) => (
                      <li key={idx} className="text-xs text-amber-100/60 flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Top 3 Nearest Matches */}
          <div className="bg-[#140e09] border border-[#2b1d12] p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <History className="w-4 h-4 text-orange-500" />
              Top 3 Nearest Matches Under Similar Match Circumstance
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {baselineData.twin_matches && baselineData.twin_matches.map((twin, idx) => (
                <div key={idx} className="bg-[#0a0908] border border-[#26180e] p-4 rounded-2xl space-y-2">
                  <div className="text-[10px] font-mono text-amber-500 flex justify-between">
                    <span className="truncate max-w-[140px]">{twin.tournament}</span>
                    <span>{twin.date}</span>
                  </div>
                  <div className="text-xs font-bold text-[#fffbf5]">{twin.fixture}</div>
                  <div className="text-[11px] text-amber-100/60 pt-2 border-t border-[#1e140d] flex justify-between">
                    <span>Target: {twin.target}</span>
                    <span className="text-amber-400 font-semibold">{twin.result_summary}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Indicator leading down to Stage 2 */}
          <div className="flex items-center justify-center gap-2 text-amber-500 font-mono text-xs pt-2">
            <span>Baseline established. Now test tactical what-if scenarios below</span>
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </div>

          {/* STAGE 2: What-If Alternate Reality Prompt & Shift Evaluation */}
          <div className="bg-[#140e09] border border-orange-500/30 p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#24170d] pb-3">
              <h2 className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                2. Tactical What-If Scenario
              </h2>
              <span className="text-[11px] font-mono text-amber-100/50">Inject Match Shifts</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. What if they lose 2 wickets in the next 6 balls? Or concede only 4 runs?"
                value={scenarioPrompt}
                onChange={e => setScenarioPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleWhatIf()}
                className="flex-1 bg-[#0a0908] border border-[#3b2514] rounded-xl px-4 py-3 text-xs text-[#fffbf5] focus:outline-none focus:border-orange-500 placeholder-amber-100/30"
              />
              <button
                onClick={() => handleWhatIf()}
                disabled={whatIfLoading || !scenarioPrompt.trim()}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 disabled:opacity-40 text-[#0a0908] px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition"
              >
                <Send className="w-3.5 h-3.5" />
                {whatIfLoading ? 'Reasoning...' : 'Simulate'}
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-2">
              {[
                "What if they lose 2 wickets in the next 6 balls?",
                "What if the chasing team hits 18 runs this over?",
                "What if the death bowler yields only 4 runs in over 19?"
              ].map((chip, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setScenarioPrompt(chip);
                    handleWhatIf(chip);
                  }}
                  className="bg-[#0a0908] border border-[#2b1d12] hover:border-orange-500/40 text-amber-100/60 hover:text-amber-300 text-[11px] px-3 py-1.5 rounded-lg transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* What-If Output Display */}
            {whatIfResult && (
              <div className="space-y-6 pt-6 border-t border-[#24170d]">
                {/* Updated Shifted Win Probability */}
                <div className="grid grid-cols-2 gap-4 bg-[#0a0908] border border-[#2b1d12] p-5 rounded-2xl">
                  <div>
                    <div className="text-xs font-bold text-amber-400 uppercase">{whatIfResult.chasing_team} Win %</div>
                    <div className="text-4xl font-black text-[#fffbf5] mt-1 flex items-baseline gap-2">
                      {whatIfResult.simulated_win_prob}%
                      <span className="text-xs text-orange-400 font-mono">({whatIfResult.probability_shift})</span>
                    </div>
                    <div className="w-full bg-[#24170d] h-2 rounded-full mt-3 overflow-hidden">
                      <div className="bg-amber-500 h-2 transition-all duration-500" style={{ width: `${whatIfResult.simulated_win_prob}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-orange-400 uppercase">{whatIfResult.defending_team} Win %</div>
                    <div className="text-4xl font-black text-[#fffbf5] mt-1">
                      {(100 - whatIfResult.simulated_win_prob).toFixed(1)}%
                    </div>
                    <div className="w-full bg-[#24170d] h-2 rounded-full mt-3 overflow-hidden">
                      <div className="bg-orange-600 h-2 transition-all duration-500" style={{ width: `${100 - whatIfResult.simulated_win_prob}%` }} />
                    </div>
                  </div>
                </div>

                {/* Tactical Explanation grounded in the 3 benchmark matches */}
                <div className="bg-[#0a0908] border border-[#2b1d12] p-5 rounded-2xl space-y-3">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Counterfactual Verdict & Precedent Breakdown
                  </div>
                  <div className="text-sm font-bold text-[#fffbf5]">"{whatIfResult.verdict}"</div>
                  <p className="text-xs text-amber-100/70 leading-relaxed">{whatIfResult.tactical_reasoning}</p>

                  {whatIfResult.key_factors && (
                    <ul className="space-y-1 pt-3 border-t border-[#1e140d]">
                      {whatIfResult.key_factors.map((factor, idx) => (
                        <li key={idx} className="text-xs text-amber-100/60 flex items-start gap-2">
                          <span className="text-orange-500 font-bold">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}