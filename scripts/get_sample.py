import io
import json
import zipfile
import urllib.request
from pathlib import Path

target_dir = Path("C:/CricAI/data")
target_dir.mkdir(parents=True, exist_ok=True)

# Cricsheet Men's T20 Internationals JSON archive
URL = "https://cricsheet.org/downloads/t20s_male_json.zip"

print(f"Downloading archive from {URL} ...")
req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})

with urllib.request.urlopen(req) as response:
    zip_bytes = io.BytesIO(response.read())

print("Archive downloaded. Extracting 1 sample match JSON...")
with zipfile.ZipFile(zip_bytes) as z:
    match_files = [f for f in z.namelist() if f.endswith(".json") and not f.startswith("README")]
    sample_filename = match_files[-1]

    with z.open(sample_filename) as match_file:
        match_data = json.load(match_file)

out_path = target_dir / "sample_match.json"
with open(out_path, "w", encoding="utf-8") as out:
    json.dump(match_data, out, indent=2)

print(f"Success! Saved {sample_filename} to: {out_path.resolve()}")
print(f"Match: {match_data['info']['teams'][0]} vs {match_data['info']['teams'][1]}")
print(f"Date: {match_data['info']['dates'][0]}")