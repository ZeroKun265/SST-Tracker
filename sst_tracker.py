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

def get_past_streams(token, user_id):
    url = f"https://api.twitch.tv/helix/videos?user_id={user_id}&type=archive"
    headers = {
        "Client-ID": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(url, headers=headers)
    return response.json().get('data', [])

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

def calculate_stats():
    token = get_twitch_token()
    if not token:
        return

    user_id = get_streamer_id(token)
    if not user_id:
        print(f"Error: Could not find streamer {STREAMER_NAME}")
        return

    videos = get_past_streams(token, user_id)
    
    # Group streams by date to aggregate duration
    daily_streams = {}
    
    # Process the last 40 videos to ensure we have enough data after aggregation
    for video in videos[:40]:
        start_time = datetime.strptime(video['created_at'], "%Y-%m-%dT%H:%M:%SZ")
        date_str = start_time.strftime("%Y-%m-%d")
        duration_str = video['duration']
        
        # Parse duration (e.g., 4h20m15s)
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
        
        duration_minutes = hours * 60 + minutes + (1 if seconds > 30 else 0)
        
        # Get delay from Discord (or 0 if disabled)
        delay = get_discord_delay(start_time)
        
        if date_str not in daily_streams:
            daily_streams[date_str] = {
                "id": video['id'],
                "date": date_str,
                "startTime": video['created_at'],
                "endTime": (start_time + timedelta(minutes=duration_minutes)).isoformat() + "Z",
                "durationMinutes": duration_minutes,
                "announcedTime": (start_time - timedelta(minutes=delay)).isoformat() + "Z",
                "delayMinutes": delay,
                "raw_start": start_time
            }
        else:
            # Aggregate
            existing = daily_streams[date_str]
            existing["durationMinutes"] += duration_minutes
            # Update end time if this stream ended later
            current_end = start_time + timedelta(minutes=duration_minutes)
            existing_end = datetime.strptime(existing["endTime"].replace('Z', ''), "%Y-%m-%dT%H:%M:%S")
            if current_end > existing_end:
                existing["endTime"] = current_end.isoformat() + "Z"
            # Update start time if this stream started earlier
            if start_time < existing["raw_start"]:
                existing["raw_start"] = start_time
                existing["startTime"] = video['created_at']
                existing["announcedTime"] = (start_time - timedelta(minutes=delay)).isoformat() + "Z"
    
    # Convert back to list and sort by date descending
    streams_data = sorted(daily_streams.values(), key=lambda x: x['date'], reverse=True)
    # Remove the helper raw_start
    for s in streams_data:
        if 'raw_start' in s:
            del s['raw_start']

    # Limit to last 30 days/entries for the UI
    streams_data = streams_data[:30]
    
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
    
    # Ensure public directory exists
    if not os.path.exists('public'):
        os.makedirs('public')

    # Write JSON with explicit encoding and no trailing garbage
    with open('public/stats.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        f.truncate() # Ensure file is exactly the size of the JSON
    
    print(f"Stats updated successfully in public/stats.json (Discord Enabled: {DISCORD_ENABLED})")

if __name__ == "__main__":
    calculate_stats()
