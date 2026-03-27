import json
import os
from datetime import datetime

def manual_delay_editor():
    stats_path = os.path.join('public', 'stats.json')
    
    if not os.path.exists(stats_path):
        print(f"Error: {stats_path} not found.")
        return

    with open(stats_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    streams = data.get('streams', [])
    updated_count = 0
    
    print("--- SST Delay Manual Editor ---")
    print("Type 'skip' to leave as 0, or 'exit' to save and quit.\n")

    for stream in streams:
        # Check if delayMinutes is 0 (missing)
        if stream.get('delayMinutes', 0) == 0:
            date_str = stream['date']
            stream_id = stream.get('id', 'Unknown ID')
            duration = stream.get('durationMinutes', 0)
            
            print(f"Stream ID: {stream_id}")
            print(f"Date:      {date_str}")
            print(f"Length:    {duration} minutes")
            
            while True:
                user_input = input("Enter delay in minutes: ").strip().lower()
                
                if user_input == 'exit':
                    # Save and exit
                    with open(stats_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2)
                    print(f"\nSaved {updated_count} updates. Exiting.")
                    return
                
                if user_input == 'skip':
                    print("Skipped.\n")
                    break
                
                try:
                    delay_min = float(user_input)
                    stream['delayMinutes'] = delay_min
                    updated_count += 1
                    print(f"Updated delay to {delay_min}m.\n")
                    break
                except ValueError:
                    print("Invalid input. Please enter a number, 'skip', or 'exit'.")

    # Final save
    if updated_count > 0:
        with open(stats_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Finished! Updated {updated_count} streams.")
    else:
        print("No streams were updated.")

if __name__ == "__main__":
    manual_delay_editor()
