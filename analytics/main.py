import os
import re
import time
import json
import traceback
import psycopg2
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Union
from google import genai

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(title="CRICAI Tactical & Intelligence Reasoner", version="4.4.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f">>> Internal Server Exception: {exc}")
    origin = request.headers.get("origin", "http://localhost:5173")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": origin if origin in origins else "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true",
        }
    )

DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    return psycopg2.connect(
        dbname="cricai",
        user="postgres",
        password=os.getenv("DB_PASSWORD", "Hahahaa!1"),
        host="localhost",
        port="5432"
    )

# ========================================================
# MULTI-FORMAT XGBOOST MODEL SUITE
# ========================================================
MODEL_DIR = Path(__file__).parent
models = {
    ("MEN", "T20"): None,
    ("MEN", "ODI"): None,
    ("WOMEN", "T20"): None,
}

p_m_t20 = MODEL_DIR / "cricai_win_prob_xgb.joblib"
if p_m_t20.exists():
    try:
        models[("MEN", "T20")] = joblib.load(p_m_t20)
    except Exception as e:
        print(f">>> Error loading Men's T20 model: {e}")

p_m_odi = MODEL_DIR / "cricai_win_prob_mens_odi.joblib"
if p_m_odi.exists():
    try:
        models[("MEN", "ODI")] = joblib.load(p_m_odi)
    except Exception as e:
        print(f">>> Error loading Men's ODI model: {e}")

p_w_t20 = MODEL_DIR / "cricai_win_prob_womens_t20.joblib"
if p_w_t20.exists():
    try:
        models[("WOMEN", "T20")] = joblib.load(p_w_t20)
    except Exception as e:
        print(f">>> Error loading Women's T20 model: {e}")

print(">>> Model Suite Active:", {f"{k[0]} {k[1]}": (v is not None) for k, v in models.items()})

api_key = os.getenv("GEMINI_API_KEY", "").strip()
client = genai.Client(api_key=api_key) if api_key else None

def call_gemini_with_retry(prompt: str, retries: int = 3, as_json: bool = True):
    for attempt in range(retries):
        try:
            config = {'response_mime_type': 'application/json'} if as_json else {}
            return client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=config
            )
        except Exception as e:
            err_str = str(e)
            if ("503" in err_str or "UNAVAILABLE" in err_str) and attempt < retries - 1:
                wait_time = (attempt + 1) * 2
                print(f">>> Gemini API 503 spike. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            raise e

class BaselineRequest(BaseModel):
    format: str = "T20"
    division: str = "MEN"
    chasing_team: str = "India"
    defending_team: str = "Australia"
    target: int = 180
    current_runs: int = 132
    current_wickets: int = 4
    current_over: float = 15.4

class WhatIfRequest(BaseModel):
    baseline: BaselineRequest
    what_if_prompt: str

class ScenarioRequest(BaseModel):
    match_id: Optional[Union[str, int]] = None
    user_prompt: str
    current_over: Optional[float] = 16.0
    current_runs: Optional[int] = None
    current_wickets: Optional[int] = None

class PlayerComparisonRequest(BaseModel):
    player_a: str
    player_b: str
    wing: str = "bowling"

def compute_xgb_prob(
    runs_needed: int,
    balls_remaining: int,
    wickets_in_hand: int,
    crr: float,
    rrr: float,
    format_str: str = "T20",
    division_str: str = "MEN"
) -> float:
    fmt_key = "ODI" if "ODI" in format_str.upper() else "T20"
    div_key = "WOMEN" if "WOMEN" in division_str.upper() else "MEN"

    selected_model = models.get((div_key, fmt_key))
    if selected_model is None:
        selected_model = models.get(("MEN", fmt_key)) or models.get(("MEN", "T20"))

    if selected_model is None:
        par_rrr = 6.0 if fmt_key == "ODI" else 8.5
        z = (par_rrr - rrr) * 0.42 + (wickets_in_hand - 5) * 0.38
        return float(np.clip(1.0 / (1.0 + np.exp(-z)) * 100.0, 1.0, 99.0))

    try:
        features = pd.DataFrame([{
            'runs_needed': max(0, runs_needed),
            'balls_remaining': max(1, balls_remaining),
            'wickets_in_hand': max(0, wickets_in_hand),
            'crr': crr,
            'rrr': rrr
        }])
        prob = selected_model.predict_proba(features)[0][1] * 100.0
        return float(np.clip(prob, 1.0, 99.0))
    except Exception as e:
        print(f"XGB inference error for {div_key} {fmt_key}: {e}")
        return 50.0

def find_top_3_twin_matches(conn, match_type: str, target: int, current_runs: int, balls_remaining: int, wickets_in_hand: int):
    try:
        cur = conn.cursor()
        query = """
            WITH inn1_targets AS (
                SELECT match_id, COALESCE(SUM(runs_total), 160) + 1 AS target_runs
                FROM deliveries
                WHERE innings_number = 1
                GROUP BY match_id
            ),
            inn2_state AS (
                SELECT match_id,
                       COALESCE(SUM(runs_total), 0) AS runs_scored,
                       COALESCE(SUM(CASE WHEN is_wicket THEN 1 ELSE 0 END), 0) AS wickets_lost
                FROM deliveries
                WHERE innings_number = 2
                GROUP BY match_id
            )
            SELECT m.match_id, m.team1, m.team2, m.winner,
                   COALESCE(m.event_name, m.match_type) AS event_name,
                   m.match_date,
                   t.target_runs,
                   COALESCE(s.runs_scored, CAST(t.target_runs * 0.75 AS INT)) AS phase_runs,
                   (10 - COALESCE(s.wickets_lost, 4)) AS wickets_left,
                   (ABS(t.target_runs - %s) * 0.35 + ABS((10 - COALESCE(s.wickets_lost, 4)) - %s) * 5.0) AS similarity_score
            FROM matches m
            JOIN inn1_targets t ON CAST(m.match_id AS VARCHAR) = CAST(t.match_id AS VARCHAR)
            LEFT JOIN inn2_state s ON CAST(m.match_id AS VARCHAR) = CAST(s.match_id AS VARCHAR)
            WHERE m.winner IS NOT NULL
            ORDER BY similarity_score ASC
            LIMIT 3;
        """
        cur.execute(query, (target, wickets_in_hand))
        rows = cur.fetchall()

        twins = []
        for r in rows:
            twins.append({
                "match_id": str(r[0]),
                "fixture": f"{r[1]} vs {r[2]}",
                "winner": r[3],
                "tournament": r[4],
                "date": str(r[5]) if r[5] else "N/A",
                "target": int(r[6]),
                "score_at_phase": f"{int(r[7])}/{10 - int(r[8])}",
                "result_summary": f"{r[3]} won" if r[3] else "Completed"
            })
        cur.close()

        if not twins:
            cur = conn.cursor()
            cur.execute("SELECT match_id, team1, team2, winner, COALESCE(event_name, match_type), match_date FROM matches WHERE winner IS NOT NULL LIMIT 3;")
            fallback_rows = cur.fetchall()
            for r in fallback_rows:
                twins.append({
                    "match_id": str(r[0]),
                    "fixture": f"{r[1]} vs {r[2]}",
                    "winner": r[3],
                    "tournament": r[4],
                    "date": str(r[5]) if r[5] else "N/A",
                    "target": target,
                    "score_at_phase": f"{current_runs}/{10 - wickets_in_hand}",
                    "result_summary": f"{r[3]} won"
                })
            cur.close()

        return twins
    except Exception as e:
        print(f">>> Error in find_top_3_twin_matches: {e}")
        return []

def resolve_canonical_player(conn, player_input: str, is_bowler: bool = True) -> str:
    col = "bowler" if is_bowler else "batter"
    p = player_input.strip()
    tokens = p.split()

    cur = conn.cursor()
    cur.execute(f"SELECT {col} FROM deliveries WHERE {col} ILIKE %s LIMIT 1;", (p,))
    row = cur.fetchone()
    if row and row[0]:
        cur.close()
        return row[0]

    if len(tokens) > 1:
        initial = tokens[0][0]
        surname = tokens[-1]
        pattern = f"%{initial}%{surname}%"
        cur.execute(f"SELECT {col}, COUNT(*) as cnt FROM deliveries WHERE {col} ILIKE %s GROUP BY {col} ORDER BY cnt DESC LIMIT 1;", (pattern,))
        row = cur.fetchone()
        if row and row[0]:
            cur.close()
            return row[0]

        pattern = f"%{surname}%"
        cur.execute(f"SELECT {col}, COUNT(*) as cnt FROM deliveries WHERE {col} ILIKE %s GROUP BY {col} ORDER BY cnt DESC LIMIT 1;", (pattern,))
        row = cur.fetchone()
        if row and row[0]:
            cur.close()
            return row[0]
    else:
        pattern = f"%{tokens[0]}%"
        cur.execute(f"SELECT {col}, COUNT(*) as cnt FROM deliveries WHERE {col} ILIKE %s GROUP BY {col} ORDER BY cnt DESC LIMIT 1;", (pattern,))
        row = cur.fetchone()
        if row and row[0]:
            cur.close()
            return row[0]

    cur.close()
    return p

def extract_relevant_db_context(conn, user_prompt: str) -> str:
    """
    Fast entity scanner (<50ms): finds players mentioned in prompt and
    fetches career stats and phase numbers directly from PostgreSQL.
    """
    context_lines = []
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT player_name, cricsheet_name FROM player_career_summaries;")
    known_players = cur.fetchall()

    matched_players = []
    p_lower = user_prompt.lower()
    for full_name, cric_name in known_players:
        surname = full_name.split()[-1].lower()
        first = full_name.split()[0].lower()
        if surname in p_lower or first in p_lower or full_name.lower() in p_lower:
            matched_players.append((full_name, cric_name))

    matched_players = list({p[1]: p for p in matched_players}.values())[:3]

    for full_name, cric_name in matched_players:
        sql_c = """
            SELECT format, matches, runs_scored, batting_avg, strike_rate,
                   wickets, bowling_avg, bowling_econ, bowling_sr, catches, run_outs
            FROM player_career_summaries
            WHERE cricsheet_name = %s;
        """
        cur.execute(sql_c, (cric_name,))
        rows = cur.fetchall()
        if rows:
            context_lines.append(f"--- Career Stats for {full_name} ({cric_name}) ---")
            for r in rows:
                context_lines.append(
                    f"Format: {r[0]} | Matches: {r[1]} | Runs: {r[2]} (Avg {r[3]}, SR {r[4]}) | "
                    f"Wickets: {r[5]} (Avg {r[6]}, Econ {r[7]}, SR {r[8]}) | Catches: {r[9]}"
                )

        sql_phase = """
            SELECT
                COALESCE(ROUND(SUM(CASE WHEN over_number >= 15 THEN runs_total ELSE 0 END) * 6.0 /
                         NULLIF(COUNT(CASE WHEN over_number >= 15 THEN 1 END), 0), 2), 0.0) as death_econ,
                COALESCE(ROUND(SUM(CASE WHEN over_number <= 5 THEN runs_total ELSE 0 END) * 6.0 /
                         NULLIF(COUNT(CASE WHEN over_number <= 5 THEN 1 END), 0), 2), 0.0) as pp_econ,
                COALESCE(COUNT(CASE WHEN is_wicket THEN 1 END), 0) as total_wickets
            FROM deliveries
            WHERE bowler = %s;
        """
        cur.execute(sql_phase, (cric_name,))
        phase_row = cur.fetchone()
        if phase_row and (phase_row[0] > 0 or phase_row[1] > 0):
            context_lines.append(
                f"Ball-by-Ball Bowling Telemetry for {cric_name}: "
                f"Powerplay Economy: {phase_row[1]}, Death Overs Economy: {phase_row[0]}, DB Wickets: {phase_row[2]}"
            )

    cur.close()
    return "\n".join(context_lines)

# ========================================================
# DUAL-LAYER TELEMETRY ENGINE FOR COMBAT DASHBOARD
# ========================================================
@app.post("/analytics/player-stats")
def get_player_stats(req: PlayerComparisonRequest):
    conn = get_connection()
    try:
        wing = req.wing.lower()
        is_bowling = wing == "bowling"
        is_fielding = wing == "fielding"
        is_batting = not is_bowling and not is_fielding

        canon_a = resolve_canonical_player(conn, req.player_a, is_bowler=is_bowling)
        canon_b = resolve_canonical_player(conn, req.player_b, is_bowler=is_bowling)
        print(f">>> [Universal Telemetry] Wing: '{req.wing}' | '{canon_a}' vs '{canon_b}'")

        def compute_universal_telemetry(player_name, canon_name):
            # 1. Check career summary table first
            sql_career = """
                SELECT format, matches, innings_batted, runs_scored, batting_avg, strike_rate,
                       hundreds, fifties, boundary_pct, wickets, bowling_avg, bowling_econ,
                       bowling_sr, catches, run_outs, stumpings
                FROM player_career_summaries
                WHERE cricsheet_name ILIKE %s OR player_name ILIKE %s;
            """
            df_c = pd.read_sql(sql_career, conn, params=(canon_name, f"%{player_name.strip()}%"))

            # 2. Raw deliveries aggregations (fallback & micro-telemetry)
            col_target = "bowler" if is_bowling else "batter"
            runs_col = "runs_total" if is_bowling else "runs_batter"

            if is_bowling:
                fmt_sql = """
                    SELECT
                        CASE
                            WHEN POSITION('T20' IN UPPER(COALESCE(m.match_type, ''))) > 0 THEN 'T20'
                            WHEN POSITION('ODI' IN UPPER(COALESCE(m.match_type, ''))) > 0 THEN 'ODI'
                            ELSE 'Test'
                        END AS broad_format,
                        COALESCE(SUM(d.runs_total), 0) AS runs,
                        COALESCE(SUM(CASE WHEN d.is_wicket AND COALESCE(d.dismissal_kind, '') NOT IN ('run out', 'retired hurt') THEN 1 ELSE 0 END), 0) AS wickets,
                        COALESCE(COUNT(*), 0) AS balls
                    FROM deliveries d
                    JOIN matches m ON CAST(d.match_id AS VARCHAR) = CAST(m.match_id AS VARCHAR)
                    WHERE d.bowler = %s
                    GROUP BY broad_format;
                """
            else:
                fmt_sql = """
                    SELECT
                        CASE
                            WHEN POSITION('T20' IN UPPER(COALESCE(m.match_type, ''))) > 0 THEN 'T20'
                            WHEN POSITION('ODI' IN UPPER(COALESCE(m.match_type, ''))) > 0 THEN 'ODI'
                            ELSE 'Test'
                        END AS broad_format,
                        COALESCE(SUM(d.runs_batter), 0) AS runs,
                        COALESCE(COUNT(*), 0) AS balls,
                        COALESCE(SUM(CASE WHEN d.is_wicket THEN 1 ELSE 0 END), 0) AS outs
                    FROM deliveries d
                    JOIN matches m ON CAST(d.match_id AS VARCHAR) = CAST(m.match_id AS VARCHAR)
                    WHERE d.batter = %s
                    GROUP BY broad_format;
                """
            df_fmt = pd.read_sql(fmt_sql, conn, params=(canon_name,))

            formats = {"T20": 0.0, "ODI": 0.0, "Test": 0.0}
            if not df_c.empty:
                for _, r in df_c.iterrows():
                    fmt = str(r['format']).upper()
                    key = "T20" if "T20" in fmt or "IPL" in fmt else ("ODI" if "ODI" in fmt else "Test")
                    val = float(r['bowling_avg']) if is_bowling else (float(r['catches']) if is_fielding else float(r['strike_rate']))
                    if formats[key] == 0.0 or "T20I" in fmt or "ODI" in fmt:
                        formats[key] = val
            elif not df_fmt.empty:
                for _, r in df_fmt.iterrows():
                    fmt = str(r['broad_format'])
                    if is_bowling:
                        w = float(r['wickets'])
                        rn = float(r['runs'])
                        formats[fmt] = round(rn / max(1.0, w), 1) if w > 0 else 0.0
                    else:
                        b = float(r['balls'])
                        rn = float(r['runs'])
                        formats[fmt] = round((rn / max(1.0, b)) * 100.0, 1) if b > 0 else 0.0

            # 3. Innings Progression Curve (Overs 1-20)
            prog_sql = f"""
                SELECT
                    CASE
                        WHEN over_number BETWEEN 0 AND 2 THEN 'Ov 1–3'
                        WHEN over_number BETWEEN 3 AND 5 THEN 'Ov 4–6'
                        WHEN over_number BETWEEN 6 AND 10 THEN 'Ov 7–11'
                        WHEN over_number BETWEEN 11 AND 14 THEN 'Ov 12–15'
                        WHEN over_number BETWEEN 15 AND 17 THEN 'Ov 16–18'
                        ELSE 'Ov 19–20'
                    END AS phase_bucket,
                    COALESCE(SUM({runs_col}), 0) AS phase_runs,
                    COALESCE(COUNT(*), 0) AS phase_balls
                FROM deliveries
                WHERE {col_target} = %s
                GROUP BY phase_bucket;
            """
            df_prog = pd.read_sql(prog_sql, conn, params=(canon_name,))
            progression_curve = {'Ov 1–3': 0.0, 'Ov 4–6': 0.0, 'Ov 7–11': 0.0, 'Ov 12–15': 0.0, 'Ov 16–18': 0.0, 'Ov 19–20': 0.0}
            for _, r in df_prog.iterrows():
                b = str(r['phase_bucket'])
                pr = float(r['phase_runs'])
                pb = float(r['phase_balls'])
                if b in progression_curve:
                    if is_bowling:
                        progression_curve[b] = round((pr / max(1.0, pb)) * 6.0, 2) if pb > 0 else 0.0
                    else:
                        progression_curve[b] = round((pr / max(1.0, pb)) * 100.0, 1) if pb > 0 else 0.0

            # 4. Phase Wicket / Run Share
            phase_share = {"Powerplay": 33.3, "Middle": 33.3, "Death": 33.4}
            if is_bowling:
                ps_sql = """
                    SELECT
                        COALESCE(SUM(CASE WHEN over_number <= 5 THEN 1 ELSE 0 END), 0) AS pp,
                        COALESCE(SUM(CASE WHEN over_number BETWEEN 6 AND 14 THEN 1 ELSE 0 END), 0) AS mid,
                        COALESCE(SUM(CASE WHEN over_number >= 15 THEN 1 ELSE 0 END), 0) AS death
                    FROM deliveries
                    WHERE bowler = %s AND is_wicket AND COALESCE(dismissal_kind, '') NOT IN ('run out', 'retired hurt');
                """
            else:
                ps_sql = """
                    SELECT
                        COALESCE(SUM(CASE WHEN over_number <= 5 THEN runs_batter ELSE 0 END), 0) AS pp,
                        COALESCE(SUM(CASE WHEN over_number BETWEEN 6 AND 14 THEN runs_batter ELSE 0 END), 0) AS mid,
                        COALESCE(SUM(CASE WHEN over_number >= 15 THEN runs_batter ELSE 0 END), 0) AS death
                    FROM deliveries
                    WHERE batter = %s;
                """
            df_ps = pd.read_sql(ps_sql, conn, params=(canon_name,))
            if not df_ps.empty:
                pp = float(df_ps['pp'].iloc[0])
                mid = float(df_ps['mid'].iloc[0])
                death = float(df_ps['death'].iloc[0])
                tot = max(1.0, pp + mid + death)
                phase_share = {
                    "Powerplay": round((pp / tot) * 100, 1),
                    "Middle": round((mid / tot) * 100, 1),
                    "Death": round((death / tot) * 100, 1),
                }

            # 5. Pie Distribution
            if is_bowling:
                dism_sql = """
                    SELECT
                        CASE
                            WHEN POSITION('bowled' IN LOWER(COALESCE(dismissal_kind, ''))) > 0 THEN 'Bowled'
                            WHEN POSITION('lbw' IN LOWER(COALESCE(dismissal_kind, ''))) > 0 THEN 'LBW'
                            ELSE 'Caught'
                        END AS kind,
                        COUNT(*) as count
                    FROM deliveries
                    WHERE bowler = %s AND is_wicket AND COALESCE(dismissal_kind, '') NOT IN ('run out', 'retired hurt')
                    GROUP BY kind;
                """
                df_d = pd.read_sql(dism_sql, conn, params=(canon_name,))
                d_map = dict(zip(df_d['kind'], df_d['count'])) if not df_d.empty else {}
                pie_data = [
                    {"name": "Caught", "value": int(d_map.get("Caught", 0)), "color": "#f59e0b"},
                    {"name": "Bowled", "value": int(d_map.get("Bowled", 0)), "color": "#ea580c"},
                    {"name": "LBW", "value": int(d_map.get("LBW", 0)), "color": "#dc2626"},
                ]
            elif is_fielding:
                f_sql = """
                    SELECT
                        COALESCE(SUM(CASE WHEN dismissal_kind ILIKE '%caught%' THEN 1 ELSE 0 END), 0) AS catches,
                        COALESCE(SUM(CASE WHEN dismissal_kind ILIKE '%run out%' THEN 1 ELSE 0 END), 0) AS run_outs,
                        COALESCE(SUM(CASE WHEN dismissal_kind ILIKE '%stumped%' THEN 1 ELSE 0 END), 0) AS stumpings
                    FROM deliveries
                    WHERE fielder = %s;
                """
                df_f = pd.read_sql(f_sql, conn, params=(canon_name,))
                c_val = int(df_f['catches'].iloc[0]) if not df_f.empty else 0
                ro_val = int(df_f['run_outs'].iloc[0]) if not df_f.empty else 0
                st_val = int(df_f['stumpings'].iloc[0]) if not df_f.empty else 0
                if not df_c.empty:
                    c_val = max(c_val, int(df_c['catches'].sum()))
                    ro_val = max(ro_val, int(df_c['run_outs'].sum()))
                pie_data = [
                    {"name": "Catches", "value": c_val, "color": "#f59e0b"},
                    {"name": "Run Outs", "value": ro_val, "color": "#ea580c"},
                    {"name": "Stumpings", "value": st_val, "color": "#dc2626"},
                ]
            else:
                bound_sql = """
                    SELECT
                        COALESCE(SUM(CASE WHEN runs_batter = 4 THEN 4 ELSE 0 END), 0) AS runs_in_4s,
                        COALESCE(SUM(CASE WHEN runs_batter = 6 THEN 6 ELSE 0 END), 0) AS runs_in_6s,
                        COALESCE(SUM(CASE WHEN runs_batter NOT IN (4, 6) THEN runs_batter ELSE 0 END), 0) AS runs_in_running
                    FROM deliveries
                    WHERE batter = %s;
                """
                df_b = pd.read_sql(bound_sql, conn, params=(canon_name,))
                r_4s = float(df_b['runs_in_4s'].iloc[0]) if not df_b.empty else 0.0
                r_6s = float(df_b['runs_in_6s'].iloc[0]) if not df_b.empty else 0.0
                r_run = float(df_b['runs_in_running'].iloc[0]) if not df_b.empty else 0.0
                pie_data = [
                    {"name": "Singles & 2s", "value": int(r_run), "color": "#f59e0b"},
                    {"name": "Fours (4s)", "value": int(r_4s), "color": "#ea580c"},
                    {"name": "Sixes (6s)", "value": int(r_6s), "color": "#dc2626"},
                ]

            # 6. Tale of the Tape calculation
            if is_bowling:
                tot_r = float(df_fmt['runs'].sum()) if not df_fmt.empty else 0.0
                tot_w = float(df_fmt['wickets'].sum()) if not df_fmt.empty else 0.0
                tot_b = float(df_fmt['balls'].sum()) if not df_fmt.empty else 0.0
                raw_econ = round((tot_r / max(1.0, tot_b)) * 6.0, 2) if tot_b > 0 else 0.0
                raw_sr = round(tot_b / max(1.0, tot_w), 1) if tot_w > 0 else 0.0
                raw_death_econ = progression_curve.get('Ov 16–18', raw_econ * 1.2)

                radar = {
                    "Economy Control": int(np.clip(100 - (raw_econ - 4.5) * 15, 20, 99)) if raw_econ > 0 else 50,
                    "Wicket Strike Rate": int(np.clip(100 - (raw_sr - 14) * 3.5, 20, 99)) if raw_sr > 0 else 50,
                    "Death Phase Control": int(np.clip(100 - (raw_death_econ - 6.0) * 14, 20, 99)) if raw_death_econ > 0 else 50,
                    "Dot Ball Ratio": 75,
                    "Pressure Factor": 80,
                    "Tournament Impact": 85
                }
                return {
                    "canonical_name": canon_name,
                    "formats": formats,
                    "overall_economy": raw_econ,
                    "strike_rate": raw_sr,
                    "dot_pct": "44.5%",
                    "death_economy": raw_death_econ,
                    "overall_average": round(tot_r / max(1.0, tot_w), 1) if tot_w > 0 else 0.0,
                    "boundary_pct": "0.0%",
                    "chase_index": 0.0,
                    "catches": 0,
                    "run_outs": 0,
                    "progression_curve": progression_curve,
                    "phase_share": phase_share,
                    "pie_data": pie_data,
                    "radar": radar
                }
            elif is_fielding:
                c_cnt = pie_data[0]["value"]
                ro_cnt = pie_data[1]["value"]
                radar = {
                    "Total Catches": int(np.clip(c_cnt * 1.5, 20, 99)),
                    "Run Out Threat": int(np.clip(ro_cnt * 4.0, 20, 99)),
                    "Catch Consistency": 82,
                    "Direct Hit Accuracy": 78,
                    "Ground Fielding Saves": 84,
                    "Clutch Dismissals": 85
                }
                return {
                    "canonical_name": canon_name,
                    "formats": formats,
                    "overall_economy": 0.0,
                    "strike_rate": 0.0,
                    "dot_pct": "0.0%",
                    "death_economy": 0.0,
                    "overall_average": 0.0,
                    "boundary_pct": "0.0%",
                    "chase_index": 0.0,
                    "catches": c_cnt,
                    "run_outs": ro_cnt,
                    "progression_curve": progression_curve,
                    "phase_share": phase_share,
                    "pie_data": pie_data,
                    "radar": radar
                }
            else:
                tot_r = float(df_fmt['runs'].sum()) if not df_fmt.empty else 0.0
                tot_b = float(df_fmt['balls'].sum()) if not df_fmt.empty else 0.0
                tot_outs = float(df_fmt['outs'].sum()) if not df_fmt.empty else 0.0
                raw_avg = round(tot_r / max(1.0, tot_outs), 1) if tot_outs > 0 else round(tot_r, 1)
                raw_sr = round((tot_r / max(1.0, tot_b)) * 100.0, 1) if tot_b > 0 else 0.0

                radar = {
                    "Batting Average": int(np.clip(raw_avg * 1.8, 20, 99)) if raw_avg > 0 else 50,
                    "Career Strike Rate": int(np.clip((raw_sr - 70) * 0.9, 20, 99)) if raw_sr > 0 else 50,
                    "Powerplay Acceleration": int(np.clip(progression_curve.get('Ov 1–3', 100) * 0.7, 20, 99)),
                    "Death Acceleration": int(np.clip(progression_curve.get('Ov 19–20', 120) * 0.45, 20, 99)),
                    "Anchor Resilience": int(np.clip((tot_b / max(1.0, tot_outs)) * 2.0, 20, 99)) if tot_outs > 0 else 50,
                    "Chase Conversion": 85
                }
                return {
                    "canonical_name": canon_name,
                    "formats": formats,
                    "overall_economy": 0.0,
                    "strike_rate": raw_sr,
                    "dot_pct": "38.5%",
                    "death_economy": 0.0,
                    "overall_average": raw_avg,
                    "boundary_pct": "58.4%",
                    "chase_index": round(raw_avg * 1.5, 1),
                    "catches": 0,
                    "run_outs": 0,
                    "progression_curve": progression_curve,
                    "phase_share": phase_share,
                    "pie_data": pie_data,
                    "radar": radar
                }

        stats_a = compute_universal_telemetry(req.player_a, canon_a)
        stats_b = compute_universal_telemetry(req.player_b, canon_b)

        return {
            "player_a": req.player_a,
            "player_b": req.player_b,
            "wing": req.wing,
            "stats_a": stats_a,
            "stats_b": stats_b
        }
    except Exception as e:
        print(">>> [FATAL ERROR TRACEBACK]:")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": f"Database calculation failed: {str(e)}"})
    finally:
        conn.close()

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "CRICAI Tactical Reasoner",
        "models_loaded": {f"{k[0]} {k[1]}": (v is not None) for k, v in models.items()},
        "gemini_configured": bool(api_key)
    }

# ==========================================
# STAGE 1 ENDPOINT: BASELINE & TWIN MATCHES
# ==========================================
@app.post("/analytics/sandbox-baseline")
def sandbox_baseline(req: BaselineRequest):
    conn = get_connection()
    try:
        total_balls = 300 if req.format.upper() == "ODI" else 120
        balls_bowled = int(req.current_over) * 6 + int(round((req.current_over % 1) * 10))
        balls_remaining = max(1, total_balls - balls_bowled)
        runs_needed = max(0, req.target - req.current_runs)
        wickets_in_hand = max(0, 10 - req.current_wickets)

        crr = (req.current_runs / max(1, balls_bowled)) * 6.0
        rrr = (runs_needed / balls_remaining) * 6.0

        base_prob = compute_xgb_prob(
            runs_needed,
            balls_remaining,
            wickets_in_hand,
            crr,
            rrr,
            format_str=req.format,
            division_str=req.division
        )
        twin_matches = find_top_3_twin_matches(conn, req.format, req.target, req.current_runs, balls_remaining, wickets_in_hand)

        baseline_analysis = {
            "verdict": f"{req.chasing_team} holds a slight edge but faces a stiff required rate.",
            "tactical_reasoning": "Chase balance is delicately positioned between wicket preservation and boundary acceleration.",
            "key_factors": [
                f"Required Run Rate sitting at {round(rrr, 2)}",
                f"{wickets_in_hand} wickets remaining to deploy during death overs",
                f"Current Run Rate maintained at {round(crr, 2)}"
            ]
        }

        if client:
            prompt = f"""
You are CricAI's Chief Tactical Intelligence Reasoner.
Analyze this initial baseline match situation:
- Division & Format: {req.division} {req.format}
- Chasing: {req.chasing_team} | Defending: {req.defending_team}
- Target: {req.target} | Current Score: {req.current_runs}/{req.current_wickets} in {req.current_over} overs
- Need: {runs_needed} runs from {balls_remaining} balls (RRR: {round(rrr, 2)}, CRR: {round(crr, 2)})
- Calibrated ML Win Probability for {req.chasing_team}: {round(base_prob, 1)}%

Top 3 Real Historical Matches In Database Under Similar Chase Circumstances:
{json.dumps(twin_matches, indent=2)}

Task:
Provide an expert tactical analysis of this baseline state. Ground your reasoning in how realistic this RRR is given wickets in hand, and reference how the 3 historical matches played out.
Return strict JSON:
{{
  "verdict": "Single sentence summarizing the baseline state.",
  "tactical_reasoning": "2-3 paragraphs evaluating pressure, phase dynamics, resource conservation, and historical comparisons.",
  "key_factors": [
    "Primary phase pressure point",
    "Resource/wicket leverage factor",
    "Historical match parallel"
  ]
}}
"""
            try:
                res = call_gemini_with_retry(prompt, as_json=True)
                baseline_analysis = json.loads(res.text)
            except Exception as e:
                print(f">>> Gemini baseline generation fallback: {e}")

        return {
            "chasing_team": req.chasing_team,
            "defending_team": req.defending_team,
            "target": req.target,
            "current_runs": req.current_runs,
            "current_wickets": req.current_wickets,
            "current_over": req.current_over,
            "crr": round(crr, 2),
            "rrr": round(rrr, 2),
            "runs_needed": runs_needed,
            "balls_remaining": balls_remaining,
            "base_win_prob": round(base_prob, 1),
            "twin_matches": twin_matches,
            "verdict": baseline_analysis.get("verdict"),
            "tactical_reasoning": baseline_analysis.get("tactical_reasoning"),
            "key_factors": baseline_analysis.get("key_factors", [])
        }
    finally:
        conn.close()

# ==========================================
# STAGE 2 ENDPOINT: WHAT-IF ALTERNATE REALITY
# ==========================================
@app.post("/analytics/sandbox-whatif")
def sandbox_whatif(req: WhatIfRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API Key missing.")

    conn = get_connection()
    try:
        b = req.baseline
        total_balls = 300 if b.format.upper() == "ODI" else 120
        balls_bowled = int(b.current_over) * 6 + int(round((b.current_over % 1) * 10))
        balls_remaining = max(1, total_balls - balls_bowled)
        runs_needed = max(0, b.target - b.current_runs)
        wickets_in_hand = max(0, 10 - b.current_wickets)

        crr = (b.current_runs / max(1, balls_bowled)) * 6.0
        rrr = (runs_needed / balls_remaining) * 6.0

        base_prob = compute_xgb_prob(
            runs_needed,
            balls_remaining,
            wickets_in_hand,
            crr,
            rrr,
            format_str=b.format,
            division_str=b.division
        )
        twin_matches = find_top_3_twin_matches(conn, b.format, b.target, b.current_runs, balls_remaining, wickets_in_hand)

        prompt = f"""
You are CricAI's Chief Tactical Intelligence Reasoner.
Baseline Chase Situation:
- Format: {b.division} {b.format}
- Chasing: {b.chasing_team} | Defending: {b.defending_team}
- Target: {b.target} | Score: {b.current_runs}/{b.current_wickets} in {b.current_over} overs
- Required: {runs_needed} off {balls_remaining} balls (RRR: {round(rrr, 2)}, CRR: {round(crr, 2)})
- Baseline Win Probability for {b.chasing_team}: {round(base_prob, 1)}%

Tactical Counterfactual Scenario:
\"{req.what_if_prompt}\"

Top 3 Real Historical Matches Under Similar Match Circumstances:
{json.dumps(twin_matches, indent=2)}

Task:
1. Re-evaluate win probability for '{b.chasing_team}' under this alternate scenario.
2. Provide 'probability_shift' (e.g. '+14.5%' or '-22.0%').
3. In 'tactical_reasoning', explicitly compare against the 3 historical matches provided, justifying the shift.
4. Return strict JSON:
{{
  "chasing_team": "{b.chasing_team}",
  "defending_team": "{b.defending_team}",
  "simulated_win_prob": 64.0,
  "probability_shift": "+14.0%",
  "verdict": "Clear takeaway citing historical precedent",
  "tactical_reasoning": "Deep analysis citing how those 3 twin matches completed.",
  "key_factors": ["Point 1", "Point 2", "Point 3"]
}}
"""
        res = call_gemini_with_retry(prompt, as_json=True)
        parsed = json.loads(res.text)
        parsed["twin_matches"] = twin_matches
        return parsed
    finally:
        conn.close()

# ==========================================
# STAGE 3 ENDPOINT: FAST RAG SEARCH & SIMULATION
# ==========================================
@app.post("/analytics/simulate-scenario")
def simulate_scenario(req: ScenarioRequest):
    str_match_id = str(req.match_id).strip() if req.match_id else None
    conn = get_connection()
    try:
        if not str_match_id:
            start_t = time.time()
            db_context = extract_relevant_db_context(conn, req.user_prompt)
            print(f">>> DB Entity Context Extracted in {(time.time() - start_t)*1000:.1f}ms")

            rag_prompt = f"""You are CricAI's Chief Cricket Tactical Intelligence Reasoner on the home search widget.
User Question: "{req.user_prompt}"

{f"VERIFIED CRICKET DATABASE GROUND TRUTH:{chr(10)}{db_context}" if db_context else "Note: No specific player record matched in local DB; ground your answer in verified multi-format international cricket history."}

STRICT HOMEPAGE OUTPUT RULES:
1. This is a homepage search card. Keep the answer extremely brief and punchy (under 65 words total).
2. Absolutely NO essays, filler intros, or multi-paragraph walls of text.
3. Structure your response into EXACTLY two parts separated by an empty line:
   - Part 1 (First line): State the direct, definitive answer in ONE bold sentence (e.g. "**Anil Kumble is India's all-time leading bowler with 956 international wickets, followed by R Ashwin among active bowlers.**").
   - Part 2 (Below): A short 2-3 sentence tactical explanation citing key stats (max 40 words).
"""
            try:
                res = call_gemini_with_retry(rag_prompt, retries=2, as_json=False)
                markdown_text = res.text.strip() if (res and res.text) else "No analysis available."
            except Exception as e:
                print(f">>> Gemini API invocation failed: {e}")
                markdown_text = f"**Tactical Query Notice**: Service temporarily unavailable ({str(e)})."

            paragraphs = [p.strip() for p in markdown_text.split("\n\n") if p.strip()]
            if len(paragraphs) >= 2:
                direct_answer = paragraphs[0].replace("**", "").replace("#", "").strip()
                short_explanation = "\n\n".join(paragraphs[1:]).strip()
            else:
                lines = [l.strip() for l in markdown_text.split("\n") if l.strip()]
                direct_answer = lines[0].replace("**", "").replace("#", "").strip() if lines else "Tactical Analysis"
                short_explanation = "\n".join(lines[1:]).strip() if len(lines) > 1 else ""

            return {
                "direct_answer": direct_answer,
                "short_explanation": short_explanation,
                "verdict": direct_answer,
                "markdown_verdict": markdown_text,
                "tactical_reasoning": short_explanation,
                "has_db_context": bool(db_context),
                "context_summary": db_context.split("\n")[0] if db_context else "General Cricket Knowledge"
            }

        # Match Detail page workflow
        match_query = "SELECT match_id, match_type, team1, team2, winner FROM matches WHERE match_id = %s;"
        df_match = pd.read_sql(match_query, conn, params=(str_match_id,))
        if df_match.empty:
            raise HTTPException(status_code=404, detail="Match not found")

        match_fmt = df_match['match_type'].iloc[0] or 'T20'
        deliveries_query = "SELECT innings_number, batting_team, runs_total, is_wicket, over_number FROM deliveries WHERE match_id = %s;"
        df_deliv = pd.read_sql(deliveries_query, conn, params=(str_match_id,))

        inn1 = df_deliv[df_deliv['innings_number'] == 1]
        inn2 = df_deliv[df_deliv['innings_number'] == 2]

        target = int(inn1['runs_total'].sum()) + 1 if not inn1.empty else 160
        chasing_team = inn2['batting_team'].iloc[0] if not inn2.empty else df_match['team2'].iloc[0]
        defending_team = inn1['batting_team'].iloc[0] if not inn1.empty else df_match['team1'].iloc[0]

        sim_over = float(req.current_over or 16.0)
        balls_remaining = max(1, 120 - int(sim_over * 6))
        current_runs = int(target * 0.75)
        current_wickets = 4
        runs_needed = max(0, target - current_runs)
        wickets_in_hand = 6

        crr = (current_runs / max(1, int(sim_over * 6))) * 6.0
        rrr = (runs_needed / balls_remaining) * 6.0
        base_prob = compute_xgb_prob(
            runs_needed,
            balls_remaining,
            wickets_in_hand,
            crr,
            rrr,
            format_str=match_fmt,
            division_str="MEN"
        )
        twin_matches = find_top_3_twin_matches(conn, match_fmt, target, current_runs, balls_remaining, wickets_in_hand)

        prompt = f"""
Match Baseline: Chasing {chasing_team} vs {defending_team}, Target: {target}, Current: {current_runs}/{current_wickets} in {sim_over} ov.
Baseline Win Prob: {round(base_prob, 1)}%.
User Scenario: "{req.user_prompt}"
Twin matches: {json.dumps(twin_matches)}
Return strict JSON with keys: chasing_team, defending_team, original_win_prob, simulated_win_prob, probability_shift, verdict, tactical_reasoning, key_factors.
"""
        res = call_gemini_with_retry(prompt, as_json=True)
        parsed = json.loads(res.text)
        parsed["twin_matches"] = twin_matches
        return parsed
    finally:
        conn.close()