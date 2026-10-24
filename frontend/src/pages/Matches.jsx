import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Calendar, MapPin, ArrowRight, Activity, Flame, Users } from 'lucide-react';

export default function Matches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // 5-Way Filter State
  const [genderFilter, setGenderFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [tournamentFilter, setTournamentFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  useEffect(() => {
    axios.get('http://localhost:8080/api/matches')
      .then(res => {
        // Exclude Test matches from white-ball telemetry
        const limitedOversOnly = res.data.filter(
          m => m.matchType && !m.matchType.toLowerCase().includes('test') && m.matchType !== 'MDM'
        );
        setMatches(limitedOversOnly);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Helper to detect gender/division
  const isWomensMatch = (m) => {
    if (m.gender && m.gender.toLowerCase() === 'female') return true;
    const text = `${m.team1} ${m.team2} ${m.eventName || ''}`.toLowerCase();
    return text.includes('women');
  };

  // Compute unique filter options
  const { availableFormats, availableTournaments, availableTeams, availableYears } = useMemo(() => {
    const formats = new Set();
    const tournaments = new Set();
    const teams = new Set();
    const years = new Set();

    matches.forEach(m => {
      if (m.matchType) formats.add(m.matchType);
      if (m.eventName && m.eventName.trim().length > 0) {
        tournaments.add(m.eventName.trim());
      }
      if (m.team1) teams.add(m.team1);
      if (m.team2) teams.add(m.team2);
      if (m.matchDate && m.matchDate.length >= 4) {
        years.add(m.matchDate.substring(0, 4));
      }
    });

    return {
      availableFormats: Array.from(formats).sort(),
      availableTournaments: Array.from(tournaments).sort(),
      availableTeams: Array.from(teams).sort(),
      availableYears: Array.from(years).sort().reverse()
    };
  }, [matches]);

  // Apply All 5 Filters
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // 1. Gender Filter
      const isWomen = isWomensMatch(m);
      if (genderFilter === 'MEN' && isWomen) return false;
      if (genderFilter === 'WOMEN' && !isWomen) return false;

      // 2. Format Filter
      if (formatFilter !== 'ALL' && m.matchType !== formatFilter) return false;

      // 3. Tournament Filter
      if (tournamentFilter !== 'ALL' && (!m.eventName || m.eventName.trim() !== tournamentFilter)) return false;

      // 4. Team Filter
      if (teamFilter !== 'ALL' && m.team1 !== teamFilter && m.team2 !== teamFilter) return false;

      // 5. Year Filter
      if (yearFilter !== 'ALL' && (!m.matchDate || !m.matchDate.startsWith(yearFilter))) return false;

      return true;
    });
  }, [matches, genderFilter, formatFilter, tournamentFilter, teamFilter, yearFilter]);

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#24170d] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c130b] border border-amber-500/20 text-amber-400 text-xs font-mono mb-2">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Limited-Overs Telemetry Archive
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[#fffbf5]">
            Match Explorer & Alternate Reality
          </h1>
          <p className="text-xs text-amber-100/60 mt-1">
            Filter fixtures across Men's & Women's cricket, formats, tournaments, and seasons.
          </p>
        </div>

        <div className="text-right text-xs font-mono text-amber-400/80">
          {loading ? 'Scanning DB...' : `${filteredMatches.length} Fixtures Isolated`}
        </div>
      </div>

      {/* 5-Way Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-[#140e09] border border-[#2b1d12] p-4 rounded-2xl">
        {/* 1. Division / Gender */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-amber-100/40 mb-1.5">
            1. Division
          </label>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="w-full bg-[#0a0908] border border-[#3b2514] text-xs text-[#fffbf5] rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Men & Women</option>
            <option value="MEN">Men's Cricket</option>
            <option value="WOMEN">Women's Cricket</option>
          </select>
        </div>

        {/* 2. Format */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-amber-100/40 mb-1.5">
            2. Format
          </label>
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="w-full bg-[#0a0908] border border-[#3b2514] text-xs text-[#fffbf5] rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All White-Ball</option>
            {availableFormats.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* 3. Tournament */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-amber-100/40 mb-1.5">
            3. Tournament
          </label>
          <select
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)}
            className="w-full bg-[#0a0908] border border-[#3b2514] text-xs text-[#fffbf5] rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 truncate"
          >
            <option value="ALL">All Tournaments</option>
            {availableTournaments.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* 4. Team */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-amber-100/40 mb-1.5">
            4. Nation
          </label>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full bg-[#0a0908] border border-[#3b2514] text-xs text-[#fffbf5] rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Nations</option>
            {availableTeams.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* 5. Year */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-amber-100/40 mb-1.5">
            5. Season
          </label>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full bg-[#0a0908] border border-[#3b2514] text-xs text-[#fffbf5] rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Years</option>
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Match Cards Grid */}
      {loading ? (
        <div className="text-center py-28 text-amber-100/40 font-mono text-xs">
          Querying limited-overs telemetry headers...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-28 border border-[#2b1d12] rounded-3xl bg-[#140e09] text-amber-100/40 text-xs">
          No matches found matching this combination. Adjust your filters above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMatches.slice(0, 48).map(m => {
            const isWomen = isWomensMatch(m);
            return (
              <div
                key={m.matchId}
                onClick={() => navigate(`/matches/${m.matchId}`)}
                className="group bg-[#140e09] border border-[#26180e] hover:border-amber-500/50 hover:bg-[#1a120c] p-5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-amber-100/50 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-amber-400 font-bold px-2 py-0.5 rounded bg-[#24170d] text-[10px]">
                        {m.matchType}
                      </span>
                      <span className={`font-mono px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isWomen
                          ? 'bg-rose-950/60 border border-rose-800/40 text-rose-300'
                          : 'bg-amber-950/40 border border-amber-800/40 text-amber-300'
                      }`}>
                        {isWomen ? "Women's" : "Men's"}
                      </span>
                    </div>

                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar className="w-3 h-3 text-amber-500" />
                      {m.matchDate || 'N/A'}
                    </span>
                  </div>

                  <div className="text-[11px] font-semibold text-orange-400/90 truncate mb-1">
                    {m.eventName || 'Bilateral Series'}
                  </div>

                  <div className="text-base font-bold text-[#fffbf5] group-hover:text-amber-400 transition mb-1">
                    {m.team1} <span className="text-amber-100/30 font-normal">vs</span> {m.team2}
                  </div>

                  <div className="text-xs text-amber-100/50 flex items-center gap-1.5 mb-3 line-clamp-1">
                    <MapPin className="w-3 h-3 text-amber-600 flex-shrink-0" />
                    {m.venue || 'International Ground'}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#24170d] flex items-center justify-between text-xs">
                  <span className="text-amber-300 font-medium truncate">
                    {m.winner ? `${m.winner} won` : 'Match Completed'}
                  </span>
                  <span className="text-amber-500 font-bold flex items-center gap-1 text-[11px] group-hover:translate-x-1 transition-transform">
                    Telemetry <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}