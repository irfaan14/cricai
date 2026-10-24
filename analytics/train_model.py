import os
import psycopg2
import pandas as pd
import numpy as np
import joblib
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import log_loss, brier_score_loss, accuracy_score
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "dbname": "cricai",
    "user": "postgres",
    "password": os.getenv("DB_PASSWORD", "Hahahaa!1"),
    "host": "localhost",
    "port": "5432"
}

def load_chase_data():
    conn = psycopg2.connect(**DB_CONFIG)

    # 1. Fetch 1st innings totals for T20 matches ONLY
    inn1_query = """
        SELECT d.match_id, SUM(d.runs_total) as target_runs
        FROM deliveries d
        JOIN matches m ON d.match_id = m.match_id
        WHERE d.innings_number = 1
          AND m.match_type IN ('T20', 'IT20')
        GROUP BY d.match_id;
    """
    df_inn1 = pd.read_sql(inn1_query, conn)
    df_inn1['target'] = df_inn1['target_runs'] + 1

    # 2. Fetch match results for T20 matches
    matches_query = """
        SELECT match_id, winner
        FROM matches
        WHERE match_type IN ('T20', 'IT20') AND winner IS NOT NULL;
    """
    df_matches = pd.read_sql(matches_query, conn)

    # 3. Fetch 2nd innings ball-by-ball for T20 matches
    deliv_query = """
        SELECT d.match_id, d.over_number, d.ball_number, d.batting_team, d.runs_total, d.is_wicket
        FROM deliveries d
        JOIN matches m ON d.match_id = m.match_id
        WHERE d.innings_number = 2
          AND m.match_type IN ('T20', 'IT20')
        ORDER BY d.match_id, d.over_number, d.ball_number;
    """
    df_deliv = pd.read_sql(deliv_query, conn)
    conn.close()

    df = df_deliv.merge(df_inn1[['match_id', 'target']], on='match_id', how='inner')
    df = df.merge(df_matches[['match_id', 'winner']], on='match_id', how='inner')
    df['is_winner'] = (df['batting_team'] == df['winner']).astype(int)

    records = []
    for match_id, group in df.groupby('match_id'):
        target = group['target'].iloc[0]
        is_winner = group['is_winner'].iloc[0]

        cum_runs = 0
        cum_wickets = 0
        ball_count = 0

        for _, row in group.iterrows():
            cum_runs += row['runs_total']
            if row['is_wicket']:
                cum_wickets += 1
            ball_count += 1

            runs_needed = max(0, target - cum_runs)
            balls_remaining = max(1, 120 - ball_count)
            wickets_in_hand = max(0, 10 - cum_wickets)

            crr = (cum_runs / max(1, ball_count)) * 6.0
            rrr = (runs_needed / balls_remaining) * 6.0

            records.append({
                'runs_needed': runs_needed,
                'balls_remaining': balls_remaining,
                'wickets_in_hand': wickets_in_hand,
                'crr': crr,
                'rrr': rrr,
                'match_won': is_winner
            })

    return pd.DataFrame(records)

def train_and_export():
    print("Extracting calibrated T20 match features from PostgreSQL...")
    df = load_chase_data()

    if df.empty or len(df) < 100:
        print("Insufficient delivery records found to train model.")
        return

    features = ['runs_needed', 'balls_remaining', 'wickets_in_hand', 'crr', 'rrr']
    X = df[features]
    y = df['match_won']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"Training XGBoost classifier on {len(X_train)} historical T20 ball states...")
    model = XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.07,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='logloss',
        random_state=42
    )
    model.fit(X_train, y_train)

    preds_proba = model.predict_proba(X_test)[:, 1]
    loss = log_loss(y_test, preds_proba)
    brier = brier_score_loss(y_test, preds_proba)
    acc = accuracy_score(y_test, (preds_proba >= 0.5).astype(int))

    print(f"\nModel Evaluation Metrics:")
    print(f"  Accuracy:    {round(acc * 100, 2)}%")
    print(f"  Log Loss:    {round(loss, 4)}")
    print(f"  Brier Score: {round(brier, 4)}")

    artifact_path = os.path.join(os.path.dirname(__file__), "cricai_win_prob_xgb.joblib")
    joblib.dump(model, artifact_path)
    print(f"\nTrained model exported to {artifact_path}")

if __name__ == '__main__':
    train_and_export()