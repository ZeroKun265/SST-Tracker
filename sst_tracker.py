import requests
import json
import os
from datetime import datetime, timedelta

# Load configuration from config.json
CONFIG_FILE = 'config.json'

def load_config():
    if not os.path.exists(CONFIG_FILE):
        print(f"Error: {CONFIG_FILE} not found. Please copy config.json.example to config.json and fill in your keys.")
        return None
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)

config = load_config()

if config:
    TWITCH_CLIENT_ID = config.get('TWITCH_CLIENT_ID')
    TWITCH_CLIENT_SECRET = config.get('TWITCH_CLIENT_SECRET')
    DISCORD_TOKEN = config.get('DISCORD_TOKEN')
    STREAMER_NAME = config.get('STREAMER_NAME', 'omenkitty12')
    ANNOUNCEMENT_CHANNEL_ID = config.get('ANNOUNCEMENT_CHANNEL_ID')
    STREAM_BOT_CHANNEL_ID = config.get('STREAM_BOT_CHANNEL_ID')
    DISCORD_ENABLED = config.get('DISCORD_ENABLED', False)
else:
    # Fallback/Exit if no config
    import sys
    sys.exit(1)

def get_twitch_token():
    url = "https://id.twitch.tv/oauth2/token"
    params = {
        "client_id": TWITCH_CLIENT_ID,
        "client_secret": TWITCH_CLIENT_SECRET,
        "grant_type": "client_credentials"
    }
    try:
        response = requests.post(url, params=params)
        response.raise_for_status()
        return response.json().get('access_token')
    except Exception as e:
        print(f"Error getting Twitch token: {e}")
        return None

def get_streamer_id(token):
    url = f"https://api.twitch.tv/helix/users?login={STREAMER_NAME}"
    headers = {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(url, headers=headers)
    data = response.json().get('data')
    if data:
        return data[0]['id']
    return None

def get_past_streams(token, user_id, fetch_all=False):
    videos = []
    cursor = None
    print(f"Fetching {'all' if fetch_all else 'latest'} streams from Twitch...")
    
    while True:
        url = f"https://api.twitch.tv/helix/videos?user_id={user_id}&type=archive&first=100"
        if cursor:
            url += f"&after={cursor}"
        
        headers = {
            "Client-ID": TWITCH_CLIENT_ID,
            "Authorization": f"Bearer {token}"
        }
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            batch = data.get('data', [])
            videos.extend(batch)
            
            print(f"  Fetched {len(batch)} videos (Total: {len(videos)})")
            
            cursor = data.get('pagination', {}).get('cursor')
            if not cursor or not fetch_all:
                break
        except Exception as e:
            print(f"Error fetching videos: {e}")
            break
            
    return videos

def get_discord_delay(stream_start_time):
    """
    Placeholder for Discord logic. 
    If DISCORD_ENABLED is False, returns 0.
    """
    if not DISCORD_ENABLED:
        return 0
    
    # Real logic would go here:
    # 1. Fetch messages from ANNOUNCEMENT_CHANNEL_ID around stream_start_time
    # 2. Find the "soon" message from the streamer
    # 3. Calculate difference in minutes
    
    # For now, returning a mock value if enabled but not implemented
    return 15 

def parse_duration(duration_str):
    hours = 0
    minutes = 0
    seconds = 0
    temp_dur = duration_str
    if 'h' in temp_dur:
        parts = temp_dur.split('h')
        hours = int(parts[0])
        temp_dur = parts[1]
    if 'm' in temp_dur:
        parts = temp_dur.split('m')
        minutes = int(parts[0])
        temp_dur = parts[1]
    if 's' in temp_dur:
        parts = temp_dur.split('s')
        seconds = int(parts[0])
    return hours * 60 + minutes + (1 if seconds > 30 else 0)

def process_and_merge(new_videos, existing_streams):
    # Map existing streams by date for easy merging
    daily_streams = {s['date']: s for s in existing_streams}
    known_vod_ids = set()
    for s in daily_streams.values():
        if 'vod_ids' in s:
            known_vod_ids.update(s['vod_ids'])
        else:
            known_vod_ids.add(s['id'])

    new_count = 0
    for video in new_videos:
        if video['id'] in known_vod_ids:
            continue
        
        new_count += 1
        start_time = datetime.strptime(video['created_at'], "%Y-%m-%dT%H:%M:%SZ")
        date_str = start_time.strftime("%Y-%m-%d")
        duration_minutes = parse_duration(video['duration'])
        delay = get_discord_delay(start_time)
        
        if date_str not in daily_streams:
            daily_streams[date_str] = {
                "id": video['id'],
                "vod_ids": [video['id']],
                "date": date_str,
                "startTime": video['created_at'],
                "endTime": (start_time + timedelta(minutes=duration_minutes)).isoformat() + "Z",
                "durationMinutes": duration_minutes,
                "announcedTime": (start_time - timedelta(minutes=delay)).isoformat() + "Z",
                "delayMinutes": delay
            }
        else:
            # Merge into existing day
            existing = daily_streams[date_str]
            if 'vod_ids' not in existing:
                existing['vod_ids'] = [existing['id']]
            
            if video['id'] not in existing['vod_ids']:
                existing['vod_ids'].append(video['id'])
                existing["durationMinutes"] += duration_minutes
                
                # Update bounds
                current_end = start_time + timedelta(minutes=duration_minutes)
                existing_end = datetime.strptime(existing["endTime"].replace('Z', ''), "%Y-%m-%dT%H:%M:%S")
                if current_end > existing_end:
                    existing["endTime"] = current_end.isoformat() + "Z"
                
                existing_start = datetime.strptime(existing["startTime"].replace('Z', ''), "%Y-%m-%dT%H:%M:%S")
                if start_time < existing_start:
                    existing["startTime"] = video['created_at']
                    existing["announcedTime"] = (start_time - timedelta(minutes=delay)).isoformat() + "Z"
    
    return list(daily_streams.values()), new_count

def calculate_stats():
    # 1. Setup and Auth
    token = get_twitch_token()
    if not token:
        return

    user_id = get_streamer_id(token)
    if not user_id:
        print(f"Error: Could not find streamer {STREAMER_NAME}")
        return

    # 2. User Prompts
    use_demo = input("Write to demo_stats.json? (y/N, default: No): ").lower().strip()
    filename = 'demo_stats.json' if use_demo in ['y', 'yes'] else 'stats.json'
    filepath = os.path.join('public', filename)

    fetch_mode = input("Fetch all historical VODs? (y/N, default: Latest 100): ").lower().strip()
    fetch_all = fetch_mode in ['y', 'yes']

    # 3. Load Existing Data
    existing_data = {"streams": [], "stats": {}}
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                print(f"Loaded {len(existing_data.get('streams', []))} existing daily entries from {filepath}")
        except Exception as e:
            print(f"Warning: Could not load existing data: {e}")

    # 4. Fetch from Twitch
    new_videos = get_past_streams(token, user_id, fetch_all=fetch_all)
    
    # 5. Process and Merge
    merged_streams, new_count = process_and_merge(new_videos, existing_data.get('streams', []))
    print(f"Processed {new_count} new VODs from Twitch.")

    # 6. Finalize and Save
    streams_data = sorted(merged_streams, key=lambda x: x['date'], reverse=True)
    
    # Recalculate Stats
    total_delay = sum(s['delayMinutes'] for s in streams_data)
    avg_delay = total_delay / len(streams_data) if streams_data else 0
    
    output = {
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "streamer": STREAMER_NAME,
        "streams": streams_data,
        "stats": {
            "averageDelay": round(avg_delay, 1),
            "totalStreamTime": sum(s['durationMinutes'] for s in streams_data),
            "longestDelay": max(s['delayMinutes'] for s in streams_data) if streams_data else 0,
            "shortestDelay": min(s['delayMinutes'] for s in streams_data) if streams_data else 0
        }
    }
    
    if not os.path.exists('public'):
        os.makedirs('public')

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        f.truncate()
    
    print(f"Stats updated successfully in {filepath} (Total Daily Entries: {len(streams_data)})")

if __name__ == "__main__":
    calculate_stats()
