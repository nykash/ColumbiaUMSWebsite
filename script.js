// Global variables
let currentEvents = [];
let currentSemester = '';
let nextLecture = null;
let currentLeadershipYear = '2025';
let latestSemester = '';
let availableSemesters = [];

// Semester display names - will be populated dynamically
let semesterNames = {};

// Function to load events index and determine latest semester
async function loadEventsIndex() {
    try {
        const response = await fetch('events/index.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const index = await response.json();
        availableSemesters = index;
        
        // Build semesterNames object dynamically
        semesterNames = {};
        index.forEach(entry => {
            const semesterKey = `${entry.year}_${entry.term}`;
            const termCapitalized = entry.term.charAt(0).toUpperCase() + entry.term.slice(1);
            semesterNames[semesterKey] = `${termCapitalized} ${entry.year}`;
        });
        
        // The first entry in index.json is the latest semester
        if (index.length > 0) {
            const latest = index[0];
            latestSemester = `${latest.year}_${latest.term}`;
            currentSemester = latestSemester;
        }
        
        return { index, latestSemester };
    } catch (error) {
        console.error('Error loading events index:', error);
        // Fallback to hardcoded values if index.json fails
        latestSemester = '2025_fall';
        currentSemester = '2025_fall';
        semesterNames = {
            '2025_fall': 'Fall 2025',
            '2025_summer': 'Summer 2025', 
            '2025_spring': 'Spring 2025',
            '2024_fall': 'Fall 2024',
            '2024_summer': 'Summer 2024',
            '2024_spring': 'Spring 2024',
            '2023_summer': 'Summer 2023',
            '2023_spring': 'Spring 2023'
        };
        return { index: [], latestSemester: '2025_fall' };
    }
}

// Function to populate the lectures dropdown menu
function populateLecturesDropdown() {
    const dropdown = document.getElementById('lectures-dropdown');
    if (!dropdown || availableSemesters.length === 0) return;
    
    // Clear existing dropdown items
    dropdown.innerHTML = '';
    
    // Add dropdown items for each available semester
    availableSemesters.forEach(entry => {
        const semesterKey = `${entry.year}_${entry.term}`;
        const termCapitalized = entry.term.charAt(0).toUpperCase() + entry.term.slice(1);
        const displayName = `${termCapitalized} ${entry.year}`;
        
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = displayName;
        link.onclick = (e) => {
            e.preventDefault();
            loadSemesterEvents(semesterKey, true);
        };
        
        dropdown.appendChild(link);
    });
}

// Function to find next upcoming or most recent lecture from latest semester
async function findNextOrRecentLecture() {
    const today = new Date();
    // Set today to start of day for comparison (so lectures on same day are considered upcoming)
    const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let upcomingLectures = [];
    let pastLectures = [];
    
    // Always use the latest semester for the front page card, regardless of what's currently displayed
    const currentSemesterForCard = latestSemester || currentSemester;
    if (!currentSemesterForCard) {
        return null;
    }
    
    let eventsForCard = [];
    
    // If we're already showing the latest semester, use current events
    if (currentSemester === currentSemesterForCard) {
        eventsForCard = currentEvents;
    } else {
        // Otherwise, fetch the latest semester events specifically for the card
        try {
            const response = await fetch(`events/${currentSemesterForCard}_events.json`);
            if (response.ok) {
                eventsForCard = await response.json();
            }
        } catch (error) {
            console.log(`Could not fetch ${currentSemesterForCard} events for front page card`);
            return null;
        }
    }
    
    // Get all events from the latest semester for the card
    const eventsToCheck = eventsForCard.filter(event => {
        return event.title && 
               event.title.trim() !== '' && 
               event.title.trim() !== 'No Title' &&
               event.title !== '&nbsp;';
    });
    
    eventsToCheck.forEach(event => {
        try {
            const semesterYear = currentSemesterForCard.split('_')[0];
            let eventDate;
            
            // Parse the date
            if (event.date.includes('-') && event.date.length > 7) {
                eventDate = new Date(event.date);
            } else {
                const dateStr = event.date.replace(/st|nd|rd|th/g, '');
                eventDate = new Date(`${dateStr}, ${semesterYear}`);
            }
            
            if (!isNaN(eventDate)) {
                // Set event date to start of day for comparison
                const eventStartOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                
                const eventWithParsedDate = {
                    ...event,
                    parsedDate: eventDate,
                    semester: currentSemesterForCard // Always use latest semester for the card
                };
                
                // Compare dates at start of day level - events on same day or later are considered upcoming
                if (eventStartOfDay >= todayStartOfDay) {
                    upcomingLectures.push(eventWithParsedDate);
                } else {
                    pastLectures.push(eventWithParsedDate);
                }
            }
        } catch (error) {
            console.log('Error parsing date for event:', event);
        }
    });
    
    // Sort upcoming lectures by date (earliest first)
    upcomingLectures.sort((a, b) => a.parsedDate - b.parsedDate);
    
    // Sort past lectures by date (most recent first)
    pastLectures.sort((a, b) => b.parsedDate - a.parsedDate);
    
    // Return next upcoming lecture, or most recent past lecture if no upcoming ones
    return upcomingLectures.length > 0 ? upcomingLectures[0] : 
           pastLectures.length > 0 ? pastLectures[0] : null;
}

// Function to update the front page lecture card
async function updateFrontPageLecture() {
    nextLecture = await findNextOrRecentLecture();
    
    if (nextLecture) {
        const cardContainer = document.querySelector('.lecture-cards .card');
        if (!cardContainer) return;
        
        const semesterYear = nextLecture.semester.split('_')[0];
        const metaText = `${nextLecture.date}, ${semesterYear} • 6:30 PM, Math 508 Cantor Lounge`;
        
        // Check if abstract is valid (non-empty and not TBD)
        const abstractText = nextLecture.abstract || '';
        const hasValidAbstract = abstractText.trim() !== '' && 
                                 abstractText.trim() !== 'No abstract available.' &&
                                 abstractText.trim() !== 'No abstract available' &&
                                 abstractText.trim().toUpperCase() !== 'TBD';
        
        // Generate different card HTML based on whether button should exist
        if (hasValidAbstract) {
            // Card with button - remove any no-button class
            cardContainer.classList.remove('card-no-button');
            cardContainer.innerHTML = `
                <h3>${nextLecture.title || 'No Title'}</h3>
                <div class="card-meta">${metaText}</div>
                <div class="card-speaker">${nextLecture.speaker || ''}</div>
                <a href="#" class="btn btn-secondary">View Abstract</a>
            `;
            
            // Attach click handler to the button
            const button = cardContainer.querySelector('.btn-secondary');
            if (button) {
                button.onclick = (e) => {
                    e.preventDefault();
                    scrollToLectureInCalendar(nextLecture);
                };
            }
        } else {
            // Card without button - add class and wrap content for vertical centering
            cardContainer.classList.add('card-no-button');
            cardContainer.innerHTML = `
                <div class="card-content-wrapper">
                    <h3>${nextLecture.title || 'No Title'}</h3>
                    <div class="card-meta">${metaText}</div>
                    <div class="card-speaker">${nextLecture.speaker || ''}</div>
                </div>
            `;
        }
    }
}

// Function to scroll to a specific lecture in the calendar
function scrollToLectureInCalendar(lecture) {
    // If the lecture is from a different semester, load that semester first
    if (lecture.semester !== currentSemester) {
        loadSemesterEvents(lecture.semester, false).then(() => {
            setTimeout(() => findAndScrollToEvent(lecture), 500);
        });
    } else {
        // Even if same semester, add a small delay to ensure DOM is ready
        setTimeout(() => {
            const found = findAndScrollToEvent(lecture);
            // If event not found, scroll to calendar section as fallback
            if (!found) {
                document.querySelector('.calendar-section').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            }
        }, 100);
    }
}

// Function to find and scroll to a specific event
function findAndScrollToEvent(lecture) {
    const calendarEvents = document.querySelectorAll('.calendar-event');
    
    for (let eventElement of calendarEvents) {
        const titleElement = eventElement.querySelector('.title');
        const speakerElement = eventElement.querySelector('.speaker');
        
        if (titleElement && speakerElement && 
            titleElement.textContent.trim() === lecture.title.trim() &&
            speakerElement.textContent.trim() === lecture.speaker.trim()) {
            
            // Highlight the event temporarily
            eventElement.style.border = '3px solid var(--theme-color)';
            eventElement.style.backgroundColor = 'color-mix(in srgb, var(--theme-color) 10%, transparent)';
            
            // Scroll to the event
            eventElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
                eventElement.style.border = '1px solid color-mix(in srgb, var(--theme-color) 30%, transparent)';
                eventElement.style.backgroundColor = '#ffffff';
            }, 3000);
            
            return true; // Found and scrolled to the event
        }
    }
    
    return false; // Event not found
}

// Function to load events from JSON file
async function loadSemesterEvents(semester, shouldScroll = true) {
    return new Promise(async (resolve, reject) => {
    try {
        console.log(`Loading events for ${semester}`);
        
        // Construct the file path
        const filePath = `events/${semester}_events.json`;
        
        // Fetch the JSON file
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const events = await response.json();
        
        currentEvents = events;
        currentSemester = semester;
        
        // Update the title
        const titleElement = document.getElementById('calendar-title');
        if (titleElement) {
            titleElement.textContent = `UMS ${semesterNames[semester]} Events`;
        }
        
        // Recreate the calendar with new events
        createCalendar(events);
        
        // Only scroll to calendar section if requested (not on initial page load)
        if (shouldScroll) {
            document.querySelector('.calendar-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }
        
        resolve(); // Resolve the promise on success
        
    } catch (error) {
        console.error('Error loading events:', error);
        // Show error message to user
        const container = document.getElementById('calendar-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <p>Sorry, we couldn't load the events for ${semesterNames[semester]}.</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Error: ${error.message}</p>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem; color: #999;">Make sure you're running this from a local server (e.g., python3 -m http.server)</p>
                </div>
            `;
        }
        reject(error); // Reject the promise on error
    }
    });
}

function createCalendar(events = currentEvents) {
    const container = document.getElementById('calendar-container');
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';
    
    // Check if events exist and is an array
    if (!events || !Array.isArray(events) || events.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p>No events found for this semester.</p>
            </div>
        `;
        return;
    }

    // Filter out events with no title and create calendar events
    events.filter(event => {
        // Skip events with no title, empty title, or just whitespace
        // Also include events that have an "events" array
        return (event.title && 
               event.title.trim() !== '' && 
               event.title.trim() !== 'No Title' &&
               event.title !== '&nbsp;') ||
               (event.events && Array.isArray(event.events) && event.events.length > 0);
    }).forEach(event => {
        // Parse date - handle different date formats
        let eventDate, monthYear, day;
        
        try {
            // Extract year from current semester
            const semesterYear = currentSemester.split('_')[0]; // e.g., '2024' from '2024_fall'
            
            // Try to parse as full date first (YYYY-MM-DD)
            if (event.date.includes('-') && event.date.length > 7) {
                eventDate = new Date(event.date);
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                monthYear = `${monthNames[eventDate.getMonth()]} ${eventDate.getFullYear()}`;
                day = eventDate.getDate();
            } else {
                // Handle formats like "Sep 10", "October 2nd", etc.
                // Use the semester year instead of current year
                const dateStr = event.date.replace(/st|nd|rd|th/g, ''); // Remove ordinals
                eventDate = new Date(`${dateStr}, ${semesterYear}`);
                
                if (isNaN(eventDate)) {
                    // Fallback: just use the original date string with semester year
                    monthYear = `${event.date} ${semesterYear}`;
                    day = '';
                } else {
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    monthYear = `${monthNames[eventDate.getMonth()]} ${semesterYear}`;
                    day = eventDate.getDate();
                }
            }
        } catch (error) {
            // Fallback for any date parsing issues - use semester year
            const semesterYear = currentSemester.split('_')[0];
            monthYear = `${event.date} ${semesterYear}`;
            day = '';
        }

        // Create event element
        const eventDiv = document.createElement('div');
        eventDiv.className = 'calendar-event';
        
        // Check if this event has nested events
        if (event.events && Array.isArray(event.events) && event.events.length > 0) {
            // Handle events with nested "events" array
            let eventsHtml = '';
            
            event.events.forEach((subEvent, index) => {
                const subTitleText = subEvent.title || '';
                const subAbstractText = subEvent.abstract || '';
                const subSpeakerText = subEvent.speaker || '';
                
                // Build HTML for this sub-event
                let subTitleHtml = '';
                let subSpeakerHtml = '';
                let subAbstractHtml = '';
                
                // Check if both title and abstract are TBD - special case
                const isTBDTitle = subTitleText.trim().toUpperCase() === 'TBD';
                const isTBDAbstract = subAbstractText.trim().toUpperCase() === 'TBD';
                const bothTBD = isTBDTitle && isTBDAbstract;
                
                if (bothTBD) {
                    // Special case: use speaker as title
                    subTitleHtml = `<div class="title">${subSpeakerText || 'No Title'}</div>`;
                } else {
                    // Normal case: show title, speaker, and abstract as appropriate
                    subTitleHtml = `<div class="title">${subTitleText || 'No Title'}</div>`;
                    
                    // Only show speaker if it exists and is not TBA/TBD
                    const hasValidSpeaker = subSpeakerText.trim() !== '' && 
                                             subSpeakerText.trim().toUpperCase() !== 'TBA' && 
                                             subSpeakerText.trim().toUpperCase() !== 'TBD';
                    subSpeakerHtml = hasValidSpeaker ? `<div class="speaker">${subSpeakerText}</div>` : '';
                    
                    // Only show abstract if it exists and is not a placeholder
                    const hasValidAbstract = subAbstractText.trim() !== '' && 
                                             subAbstractText.trim() !== 'No abstract available.' &&
                                             subAbstractText.trim() !== 'No abstract available' &&
                                             subAbstractText.trim().toUpperCase() !== 'TBD';
                    subAbstractHtml = hasValidAbstract ? `<div class="abstract">${subAbstractText}</div>` : '';
                }
                
                // Add separator between sub-events (except for the first one)
                const separator = index > 0 ? '<div class="event-separator"></div>' : '';
                
                eventsHtml += `
                    ${separator}
                    <div class="sub-event">
                        ${subTitleHtml}
                        ${subSpeakerHtml}
                        ${subAbstractHtml}
                    </div>
                `;
            });
            
            eventDiv.innerHTML = `
                <div class="calendar-date">
                    <div class="month-year">${monthYear}</div>
                    <div class="day">${day}</div>
                </div>
                <div class="calendar-content calendar-content-multiple">
                    ${eventsHtml}
                </div>
            `;
        } else {
            // Handle regular single event
            // Add clickable class and handler if event has a link
            if (event.link && event.link.trim() !== '') {
                eventDiv.classList.add('calendar-event-clickable');
                eventDiv.setAttribute('role', 'link');
                eventDiv.setAttribute('tabindex', '0');
                
                const openLink = () => {
                    window.open(event.link, '_blank');
                };
                
                eventDiv.onclick = openLink;
                
                // Add keyboard accessibility
                eventDiv.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openLink();
                    }
                });
            }

            // Check if both title and abstract are TBD - special case
            const titleText = event.title || '';
            const abstractText = event.abstract || '';
            const isTBDTitle = titleText.trim().toUpperCase() === 'TBD';
            const isTBDAbstract = abstractText.trim().toUpperCase() === 'TBD';
            const bothTBD = isTBDTitle && isTBDAbstract;
            
            let titleHtml = '';
            let speakerHtml = '';
            let abstractHtml = '';
            
            if (bothTBD) {
                // Special case: use speaker as title, show nothing else
                const speakerText = event.speaker || '';
                titleHtml = `<div class="title">${speakerText || 'No Title'}</div>`;
            } else {
                // Normal case: show title, speaker, and abstract as appropriate
                titleHtml = `<div class="title">${titleText || 'No Title'}</div>`;
                
                // Only show speaker if it exists and is not TBA/TBD
                const speakerText = event.speaker || '';
                const hasValidSpeaker = speakerText.trim() !== '' && 
                                         speakerText.trim().toUpperCase() !== 'TBA' && 
                                         speakerText.trim().toUpperCase() !== 'TBD';
                speakerHtml = hasValidSpeaker ? `<div class="speaker">${speakerText}</div>` : '';
                
                // Only show abstract if it exists and is not a placeholder
                const hasValidAbstract = abstractText.trim() !== '' && 
                                         abstractText.trim() !== 'No abstract available.' &&
                                         abstractText.trim() !== 'No abstract available' &&
                                         abstractText.trim().toUpperCase() !== 'TBD';
                abstractHtml = hasValidAbstract ? `<div class="abstract">${abstractText}</div>` : '';
            }

            // Add class to center content vertically when it's the special TBD case
            const contentClass = bothTBD ? 'calendar-content calendar-content-centered' : 'calendar-content';
            if (bothTBD) {
                eventDiv.classList.add('calendar-event-centered');
            }
            
            eventDiv.innerHTML = `
                <div class="calendar-date">
                    <div class="month-year">${monthYear}</div>
                    <div class="day">${day}</div>
                </div>
                <div class="${contentClass}">
                    ${titleHtml}
                    ${speakerHtml}
                    ${abstractHtml}
                </div>
            `;
        }

        container.appendChild(eventDiv);
    });
}

// Function to return to latest semester when UMS logo is clicked
function returnToFall2025() {
    // Load latest semester events and scroll to top
    const semesterToLoad = latestSemester || currentSemester;
    if (semesterToLoad) {
        loadSemesterEvents(semesterToLoad, false).then(() => {
            // Scroll to top of page smoothly
            window.scrollTo({ 
                top: 0, 
                behavior: 'smooth' 
            });
        });
    }
}

// Function to load leadership for a specific year
async function loadLeadershipYear(year, shouldScroll = true) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`Loading leadership for ${year}`);
            
            // Construct the file path
            const filePath = `data/leadership_${year}.json`;
            
            // Fetch the JSON file
            const response = await fetch(filePath);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const leaders = await response.json();
            
            currentLeadershipYear = year;
            
            // Update the title
            const titleElement = document.getElementById('leadership-title');
            if (titleElement) {
                titleElement.textContent = `Leadership ${year}`;
            }
            
            // Recreate the leadership cards
            createLeadershipCards(leaders);
            
            // Only scroll to leadership section if requested
            if (shouldScroll) {
                document.querySelector('.leadership-section').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            }
            
            resolve(); // Resolve the promise on success
            
        } catch (error) {
            console.error('Error loading leadership:', error);
            const container = document.getElementById('leadership-container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <p>Sorry, we couldn't load the leadership information for ${year}.</p>
                        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Error: ${error.message}</p>
                    </div>
                `;
            }
            reject(error); // Reject the promise on error
        }
    });
}

// Function to create leadership cards
function createLeadershipCards(leaders) {
    const container = document.getElementById('leadership-container');
    
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Check if leaders exist and is an array
    if (!leaders || !Array.isArray(leaders) || leaders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p>No leadership information found for this year.</p>
            </div>
        `;
        return;
    }
    
    // Create leadership cards
    leaders.forEach(leader => {
        const leaderCard = document.createElement('div');
        leaderCard.className = 'leader-card';
        
        // Determine if image exists and is not empty
        const hasImage = leader.image && leader.image.trim() !== '';
        const imageHtml = hasImage 
            ? `<div class="leader-image">
                <img src="${leader.image}" alt="${leader.name}">
               </div>`
            : `<div class="leader-image leader-image-empty"></div>`;
        
        leaderCard.innerHTML = `
            ${imageHtml}
            <div class="leader-info">
                <h3 class="leader-name">${leader.name}</h3>
                <div class="leader-title">${leader.title}</div>
                ${leader.bio ? `<p class="leader-bio">${leader.bio}</p>` : ''}
            </div>
        `;
        
        container.appendChild(leaderCard);
    });
}

// Function to load previous leadership
async function loadPreviousLeadership(shouldScroll = true) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('Loading previous leadership');
            
            // Fetch the previous leadership JSON file
            const response = await fetch('data/previous_leadership.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const previousLeaders = await response.json();
            
            // Update the title
            const titleElement = document.getElementById('leadership-title');
            if (titleElement) {
                titleElement.textContent = 'Previous Leadership';
            }
            
            // Create the timeline view
            createPreviousLeadershipTimeline(previousLeaders);
            
            // Only scroll to leadership section if requested
            if (shouldScroll) {
                document.querySelector('.leadership-section').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            }
            
            resolve();
            
        } catch (error) {
            console.error('Error loading previous leadership:', error);
            const container = document.getElementById('leadership-container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <p>Sorry, we couldn't load the previous leadership information.</p>
                        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Error: ${error.message}</p>
                    </div>
                `;
            }
            reject(error);
        }
    });
}

// Function to create previous leadership timeline
function createPreviousLeadershipTimeline(previousLeaders) {
    const container = document.getElementById('leadership-container');
    
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Check if previousLeaders exist
    if (!previousLeaders || typeof previousLeaders !== 'object') {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p>No previous leadership information found.</p>
            </div>
        `;
        return;
    }
    
    // Convert to array and sort by year (most recent first)
    const years = Object.keys(previousLeaders).sort((a, b) => parseInt(b) - parseInt(a));
    
    // Create timeline
    years.forEach(year => {
        const yearData = previousLeaders[year];
        
        // Create year section
        const yearSection = document.createElement('div');
        yearSection.className = 'timeline-year-section';
        
        // Create year header
        const yearHeader = document.createElement('div');
        yearHeader.className = 'timeline-year-header';
        yearHeader.textContent = year;
        yearSection.appendChild(yearHeader);
        
        // Create cards container
        const cardsContainer = document.createElement('div');
        const hasVicePresident = yearData['vice president'] && yearData['vice president'].trim() !== '';
        cardsContainer.className = hasVicePresident ? 'timeline-cards-row' : 'timeline-cards-single';
        
        // Create president card
        if (yearData.president) {
            const presidentCard = document.createElement('div');
            presidentCard.className = 'timeline-leader-card';
            presidentCard.innerHTML = `
                <div class="timeline-leader-role">President</div>
                <div class="timeline-leader-name">${yearData.president}</div>
            `;
            cardsContainer.appendChild(presidentCard);
        }
        
        // Create vice president card if exists
        if (hasVicePresident) {
            const vpCard = document.createElement('div');
            vpCard.className = 'timeline-leader-card';
            vpCard.innerHTML = `
                <div class="timeline-leader-role">Vice President</div>
                <div class="timeline-leader-name">${yearData['vice president']}</div>
            `;
            cardsContainer.appendChild(vpCard);
        }
        
        yearSection.appendChild(cardsContainer);
        container.appendChild(yearSection);
    });
}

// Function to load and display proof writing workshop
async function loadProofWritingWorkshop() {
    try {
        const response = await fetch('proofwriting_workshop_data/2025_fall_pw.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const descriptionElement = document.getElementById('proofwriting-description');
        const container = document.getElementById('proofwriting-container');
        
        if (!container) return;
        
        // Set the description
        if (descriptionElement && data.title) {
            descriptionElement.textContent = data.title;
        }
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create workshop cards
        if (data.material && Array.isArray(data.material)) {
            data.material.forEach(workshop => {
                const workshopCard = document.createElement('div');
                workshopCard.className = 'workshop-card';
                
                workshopCard.innerHTML = `
                    <div class="workshop-week">Week ${workshop.week}</div>
                    <div class="workshop-title">${workshop.title || 'No Title'}</div>
                    <div class="workshop-info">
                        <div class="workshop-info-item">
                            <strong>Date:</strong> ${workshop.date || 'TBA'}
                        </div>
                        <div class="workshop-info-item">
                            <strong>Time:</strong> ${workshop.time || 'TBA'}
                        </div>
                    </div>
                    <a href="${workshop.pdf_link}" class="btn btn-primary" download>Download Handout</a>
                `;
                
                container.appendChild(workshopCard);
            });
        }
        
    } catch (error) {
        console.error('Error loading proof writing workshop:', error);
        const container = document.getElementById('proofwriting-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <p>Sorry, we couldn't load the proof writing workshop information.</p>
                </div>
            `;
        }
    }
}

// Load Proof Writing by year: current year via JSON, previous years via legacy PDFs
async function loadProofWritingYear(year, shouldScroll = true) {
    return new Promise(async (resolve, reject) => {
        try {
            if (year === '2025') {
                await loadProofWritingWorkshop();
                // Wait for DOM to update before scrolling
                if (shouldScroll) {
                    await new Promise(innerResolve => {
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                scrollToProofwritingSection();
                                innerResolve();
                            }, 100);
                        });
                    });
                }
                resolve();
                return;
            }

            console.log(`Loading proof writing handouts for ${year}`);

            const descriptionElement = document.getElementById('proofwriting-description');
            const container = document.getElementById('proofwriting-container');
            if (!container) {
                resolve();
                return;
            }

            if (descriptionElement) {
                descriptionElement.textContent = `Proof Writing Workshop Handouts ${year}`;
            }

            container.innerHTML = '';

            // Use a static list of available weeks to avoid FTP 403 on programmatic fetches
            const proofLegacyWeeks = {
                '2024': [1, 2, 3],
                '2023': [1, 2, 3, 4],
                '2022': [1, 2, 3, 4]
            };
            const existingWeeks = proofLegacyWeeks[year] || [];

            if (existingWeeks.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666; grid-column: 1 / -1;">
                        <p>No handouts found for ${year}.</p>
                    </div>
                `;
                // Wait for DOM to update before scrolling
                if (shouldScroll) {
                    await new Promise(innerResolve => {
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                scrollToProofwritingSection();
                                innerResolve();
                            }, 100);
                        });
                    });
                }
                resolve();
                return;
            }

            existingWeeks.forEach(week => {
                const pdfPath = `proofwriting_workshop_data/legacy/UMSProofsWeek${week}_${year}.pdf`;
                const workshopCard = document.createElement('div');
                workshopCard.className = 'workshop-card';
                workshopCard.innerHTML = `
                    <div class="workshop-week">Week ${week}</div>
                    <div class="workshop-title"></div>
                    <div class="workshop-info" style="display:none;"></div>
                    <a href="${pdfPath}" class="btn btn-primary" download>Download Handout</a>
                `;
                container.appendChild(workshopCard);
            });

            // Wait for DOM to update before scrolling
            if (shouldScroll) {
                await new Promise(innerResolve => {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            scrollToProofwritingSection();
                            innerResolve();
                        }, 100);
                    });
                });
            }

            resolve();

        } catch (error) {
            console.error('Error loading proof writing handouts:', error);
            const container = document.getElementById('proofwriting-container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #666; grid-column: 1 / -1;">
                        <p>Sorry, we couldn't load the handouts for ${year}.</p>
                    </div>
                `;
            }
            // Still scroll even on error
            if (shouldScroll) {
                await new Promise(innerResolve => {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            scrollToProofwritingSection();
                            innerResolve();
                        }, 100);
                    });
                });
            }
            reject(error);
        }
    });
}

// Removed programmatic PDF existence checks to avoid FTP 403s

// Smoothly scroll to the proofwriting section and briefly highlight it
function scrollToProofwritingSection() {
    const section = document.querySelector('.proofwriting-section');
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section.classList.add('section-highlight');
    setTimeout(() => section.classList.remove('section-highlight'), 1200);
}

// Initialize calendar
async function initCalendar() {
    // Load events index to get available semesters and determine latest
    await loadEventsIndex();
    
    // Populate the dropdown menu with available semesters
    populateLecturesDropdown();
    
    // Load the latest semester without scrolling
    const semesterToLoad = latestSemester || currentSemester;
    if (semesterToLoad) {
        await loadSemesterEvents(semesterToLoad, false);
    }
    
    // Update front page lecture card after initial load (always from latest semester)
    await updateFrontPageLecture();
    
    // Load proof writing workshop section
    await loadProofWritingWorkshop();
    
    // Load leadership section (default to 2025)
    await loadLeadershipYear('2025', false);
}

// Mobile nav toggle
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.getElementById('primary-nav');

function closeMenu() {
    if (navLinks) {
        navLinks.classList.remove('open');
        if (menuToggle) {
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    }
}

if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    
    // Add click listeners to nav links
    navLinks.addEventListener('click', (e) => {
        const clickedLink = e.target.closest('a');
        if (clickedLink) {
            const parentDropdown = clickedLink.closest('.dropdown');
            
            // If it's a dropdown header (has dropdown-content sibling), don't close
            if (parentDropdown && clickedLink.parentElement === parentDropdown) {
                const dropdownContent = parentDropdown.querySelector('.dropdown-content');
                if (dropdownContent && clickedLink.nextElementSibling === dropdownContent) {
                    // This is a dropdown header, don't close menu
                    return;
                }
            }
            
            // For all other links (including dropdown items), close the menu
            closeMenu();
        }
    });
}

// Mobile dropdown toggle for lectures
function setupMobileDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('a');
        if (link && window.innerWidth <= 768) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                dropdown.classList.toggle('open');
            });
        }
    });
}

// Handle window resize
window.addEventListener('resize', setupMobileDropdowns);

// Initialize when page loads
window.addEventListener('load', () => {
    initCalendar();
    setupMobileDropdowns();
});

// Fallback initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initCalendar();
        setupMobileDropdowns();
    });
} else {
    initCalendar();
    setupMobileDropdowns();
}

