import os
import io
import json
import zipfile
import requests
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "dbname": "cricai",
    "user": "postgres",
    "password": os.getenv("DB_PASSWORD", "Hahahaa!1"),
    "host": "localhost",
    "port": "5432"
}

ARCHIVES = {
    "t20s_male": "https://cricsheet.org/downloads/t20s_male_json.zip",
    "t20s_female": "https://cricsheet.org/downloads/t20s_female_json.zip",
    "odis_male": "https://cricsheet.org/downloads/odis_male_json.zip",
    "tests_male": "https://cricsheet.org/downloads/tests_male_json.zip"
}

def get_connection():
    return psycopg2.connect(**DB_CONFIG)

def download_archive(url: str):
    print(f"\n[DOWNLOAD] Streaming archive from {url}...")
    resp = requests.get(url, stream=True)
    if resp.status_code != 200:
        raise Exception(f"Failed to fetch {url} (Status: {resp.status_code})")
    return zipfile.ZipFile(io.BytesIO(resp.content))

def ingest_zip(archive_name: str, max_matches=1000):
    url = ARCHIVES[archive_name]
    archive = download_archive(url)
    file_list = [f for f in archive.namelist() if f.endswith('.json') and not f.startswith('README')]
    total_files = len(file_list)
    target_count = total_files if max_matches is None else min(max_matches, total_files)

    print(f"[{archive_name}] Found {total_files} match files. Ingesting target: {target_count} matches...")

    conn = get_connection()
    cur = conn.cursor()

    matches_sql = """
        INSERT INTO matches (
            match_id, season, match_date, match_type, event_name, venue, city,
            team1, team2, toss_winner, toss_decision, winner, margin_runs, margin_wickets
        ) VALUES (
            %(match_id)s, %(season)s, %(match_date)s, %(match_type)s, %(event_name)s, %(venue)s, %(city)s,
            %(team1)s, %(team2)s, %(toss_winner)s, %(toss_decision)s, %(winner)s, %(margin_runs)s, %(margin_wickets)s
        )
        ON CONFLICT (match_id) DO NOTHING;
    """

    deliveries_sql = """
        INSERT INTO deliveries (
            match_id, innings_number, batting_team, bowling_team,
            over_number, ball_number, batter, non_striker, bowler,
            runs_batter, runs_extras, runs_total,
            is_wicket, player_dismissed, dismissal_kind, fielder
        ) VALUES (
            %(match_id)s, %(innings_number)s, %(batting_team)s, %(bowling_team)s,
            %(over_number)s, %(ball_number)s, %(batter)s, %(non_striker)s, %(bowler)s,
            %(runs_batter)s, %(runs_extras)s, %(runs_total)s,
            %(is_wicket)s, %(player_dismissed)s, %(dismissal_kind)s, %(fielder)s
        )
        ON CONFLICT DO NOTHING;
    """

    matches_batch = []
    deliveries_batch = []
    processed = 0

    for idx, fname in enumerate(file_list[:target_count]):
        match_id_str = fname.replace('.json', '')
        try:
            data = json.loads(archive.read(fname))
        except Exception:
            continue

        info = data.get('info', {})
        teams = info.get('teams', [])
        if len(teams) < 2:
            continue

        outcome = info.get('outcome', {})
        winner = outcome.get('winner')
        by_info = outcome.get('by', {})
        margin_runs = by_info.get('runs')
        margin_wickets = by_info.get('wickets')

        dates = info.get('dates', [])
        match_date = dates[0] if dates else None

        event_info = info.get('event', {})
        event_name = event_info.get('name') if isinstance(event_info, dict) else None

        toss = info.get('toss', {})

        matches_batch.append({
            'match_id': match_id_str,
            'season': str(info.get('season', '')),
            'match_date': match_date,
            'match_type': info.get('match_type', 'T20'),
            'event_name': event_name,
            'venue': info.get('venue', ''),
            'city': info.get('city', ''),
            'team1': teams[0],
            'team2': teams[1],
            'toss_winner': toss.get('winner', ''),
            'toss_decision': toss.get('decision', ''),
            'winner': winner,
            'margin_runs': margin_runs,
            'margin_wickets': margin_wickets
        })

        for inn_idx, innings_data in enumerate(data.get('innings', [])):
            innings_number = inn_idx + 1
            batting_team = innings_data.get('team', '')
            bowling_team = teams[1] if batting_team == teams[0] else teams[0]

            for over_obj in innings_data.get('overs', []):
                over_num = over_obj.get('over', 0)
                for ball_idx, delivery in enumerate(over_obj.get('deliveries', [])):
                    runs_info = delivery.get('runs', {})
                    runs_batter = runs_info.get('batter', 0)
                    runs_extras = runs_info.get('extras', 0)
                    runs_total = runs_info.get('total', runs_batter + runs_extras)

                    wickets = delivery.get('wickets', [])
                    is_wicket = len(wickets) > 0
                    player_dismissed = wickets[0].get('player_out') if is_wicket else None
                    dismissal_kind = wickets[0].get('kind') if is_wicket else None
                    fielders = wickets[0].get('fielders', []) if is_wicket else []
                    fielder_name = fielders[0].get('name') if fielders and isinstance(fielders[0], dict) else None

                    deliveries_batch.append({
                        'match_id': match_id_str,
                        'innings_number': innings_number,
                        'batting_team': batting_team,
                        'bowling_team': bowling_team,
                        'over_number': over_num,
                        'ball_number': ball_idx + 1,
                        'batter': delivery.get('batter', ''),
                        'non_striker': delivery.get('non_striker', ''),
                        'bowler': delivery.get('bowler', ''),
                        'runs_batter': runs_batter,
                        'runs_extras': runs_extras,
                        'runs_total': runs_total,
                        'is_wicket': is_wicket,
                        'player_dismissed': player_dismissed,
                        'dismissal_kind': dismissal_kind,
                        'fielder': fielder_name
                    })

        processed += 1

        if len(matches_batch) >= 50:
            execute_batch(cur, matches_sql, matches_batch)
            execute_batch(cur, deliveries_sql, deliveries_batch)
            conn.commit()
            print(f"[{archive_name}] Ingested {processed}/{target_count} matches...")
            matches_batch = []
            deliveries_batch = []

    if matches_batch:
        execute_batch(cur, matches_sql, matches_batch)
        execute_batch(cur, deliveries_sql, deliveries_batch)
        conn.commit()

    cur.close()
    conn.close()
    print(f"[{archive_name}] Batch complete! Ingested {processed} matches.")

if __name__ == '__main__':
    # Ingest 1500 Men's T20s, 500 Women's T20s, 500 ODIs, and 200 Tests
    ingest_zip("t20s_male", max_matches=1500)
    ingest_zip("t20s_female", max_matches=500)
    ingest_zip("odis_male", max_matches=500)
    ingest_zip("tests_male", max_matches=200)
    print("\nAll targeted international datasets ingested successfully!")