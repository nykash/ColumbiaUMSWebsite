import os
import json
import re
from bs4 import BeautifulSoup
from pathlib import Path

def extract_events_from_html(file_path):
    """Extract events from an HTML file containing a table with Date, Speaker, Title, Abstract columns."""
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    soup = BeautifulSoup(content, 'html.parser')
    
    # Find the table containing the events
    table = soup.find('table')
    if not table:
        return []
    
    events = []
    tbody = table.find('tbody')
    if not tbody:
        # If no tbody, look for rows directly in table
        rows = table.find_all('tr')[1:]  # Skip header row
    else:
        rows = tbody.find_all('tr')
    
    for row in rows:
        cells = row.find_all('td')
        if len(cells) >= 4:  # Ensure we have at least 4 columns
            # Extract date
            date = cells[0].get_text(strip=True)
            
            # Extract speaker (might be in a div with class "title")
            speaker_cell = cells[1]
            speaker_div = speaker_cell.find('div', class_='title')
            if speaker_div:
                speaker = speaker_div.get_text(strip=True)
            else:
                speaker = speaker_cell.get_text(strip=True)
            
            # Extract title (might contain links)
            title_cell = cells[2]
            title_link = title_cell.find('a')
            if title_link:
                title = title_link.get_text(strip=True)
            else:
                title = title_cell.get_text(strip=True)
            
            # Extract abstract (might be in a div with class "abstract")
            abstract_cell = cells[3]
            abstract_div = abstract_cell.find('div', class_='abstract')
            if abstract_div:
                abstract = abstract_div.get_text(strip=True)
            else:
                abstract = abstract_cell.get_text(strip=True)
            
            # Clean up HTML entities and extra whitespace
            date = re.sub(r'\s+', ' ', date).strip()
            speaker = re.sub(r'\s+', ' ', speaker).strip()
            title = re.sub(r'\s+', ' ', title).strip()
            abstract = re.sub(r'\s+', ' ', abstract).strip()
            
            # Skip empty or placeholder entries, but be more lenient with filtering
            # Allow entries with valid dates and speakers, even if title might be minimal
            if date and date != '&nbsp;' and speaker and speaker != '&nbsp;':
                # Don't skip entries just because title is empty or minimal
                events.append({
                    'date': date,
                    'speaker': speaker,
                    'title': title if title != '&nbsp;' else '',
                    'abstract': abstract if abstract != '&nbsp;' else ''
                })
    
    return events

def parse_filename(filename):
    """Parse filename to extract year and season."""
    # Remove .html extension
    name = filename.replace('.html', '')
    
    # Handle special cases like IntroToProofsFall2024 - treat as separate course series
    if 'IntroToProofs' in name:
        # Extract season and year from IntroToProofsFall2024 format
        match = re.search(r'IntroToProofs(Fall|Spring|Summer)(\d{4})', name)
        if match:
            season = match.group(1).lower()
            year = match.group(2)
            # Add prefix to distinguish from regular semester events
            return year, f"introproofs_{season}"
    
    # Handle regular format like 2023summer, 2024fall, etc.
    match = re.match(r'(\d{4})(fall|spring|summer)', name)
    if match:
        year = match.group(1)
        season = match.group(2)
        return year, season
    
    return None, None

def main():
    """Main function to process all HTML files and create JSON outputs."""
    script_dir = Path(__file__).parent
    
    # Get all HTML files excluding index files
    html_files = []
    for file in script_dir.glob('*.html'):
        if 'index' not in file.name.lower():
            html_files.append(file)
    
    print(f"Found {len(html_files)} HTML files to process:")
    for file in html_files:
        print(f"  - {file.name}")
    
    # Dictionary to store events organized by year and season
    events_by_year_season = {}
    
    # Process each HTML file
    for html_file in html_files:
        print(f"\nProcessing {html_file.name}...")
        
        year, season = parse_filename(html_file.name)
        if not year or not season:
            print(f"  Warning: Could not parse year/season from {html_file.name}")
            continue
        
        events = extract_events_from_html(html_file)
        print(f"  Found {len(events)} events")
        
        # Store events
        key = f"{year}_{season}"
        events_by_year_season[key] = {
            'year': year,
            'season': season,
            'events': events
        }
    
    # Create JSON files for each year/season
    print(f"\nCreating JSON files...")
    for key, data in events_by_year_season.items():
        year = data['year']
        season = data['season']
        events = data['events']
        
        filename = f"{year}_{season}_events.json"
        filepath = script_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as json_file:
            json.dump(events, json_file, indent=2, ensure_ascii=False)
        
        print(f"  Created {filename} with {len(events)} events")
    
    print(f"\nProcessing complete! Created {len(events_by_year_season)} JSON files.")

if __name__ == "__main__":
    main()
