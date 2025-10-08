// Global variables
let currentEvents = [];
let currentSemester = '2025_fall';
let nextLecture = null;

// Semester display names
const semesterNames = {
    '2025_fall': 'Fall 2025',
    '2025_summer': 'Summer 2025', 
    '2025_spring': 'Spring 2025',
    '2024_fall': 'Fall 2024',
    '2024_summer': 'Summer 2024',
    '2024_spring': 'Spring 2024',
    '2023_summer': 'Summer 2023',
    '2023_spring': 'Spring 2023'
};

// Function to find next upcoming or most recent lecture from current semester (2025_fall)
async function findNextOrRecentLecture() {
    const today = new Date();
    // Set today to start of day for comparison (so lectures on same day are considered upcoming)
    const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let upcomingLectures = [];
    let pastLectures = [];
    
    // Always use 2025_fall for the front page card, regardless of what's currently displayed
    const currentSemesterForCard = '2025_fall';
    let eventsForCard = [];
    
    // If we're already showing 2025_fall, use current events
    if (currentSemester === currentSemesterForCard) {
        eventsForCard = currentEvents;
    } else {
        // Otherwise, fetch 2025_fall events specifically for the card
        try {
            const response = await fetch(`events/${currentSemesterForCard}_events.json`);
            if (response.ok) {
                eventsForCard = await response.json();
            }
        } catch (error) {
            console.log('Could not fetch 2025_fall events for front page card');
            return null;
        }
    }
    
    // Get all events from 2025_fall semester for the card
    const eventsToCheck = eventsForCard.filter(event => {
        return event.title && 
               event.title.trim() !== '' && 
               event.title.trim() !== 'No Title' &&
               event.title !== '&nbsp;';
    });
    
    eventsToCheck.forEach(event => {
        try {
            const semesterYear = currentSemesterForCard.split('_')[0]; // Use 2025 for the card
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
                    semester: currentSemesterForCard // Always use 2025_fall for the card
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
        const cardTitle = document.querySelector('.lecture-cards .card h3');
        const cardMeta = document.querySelector('.lecture-cards .card .card-meta');
        const cardSpeaker = document.querySelector('.lecture-cards .card .card-speaker');
        const cardButton = document.querySelector('.lecture-cards .card .btn-secondary');
        
        if (cardTitle) cardTitle.textContent = nextLecture.title;
        if (cardMeta) {
            const semesterYear = nextLecture.semester.split('_')[0];
            cardMeta.textContent = `${nextLecture.date}, ${semesterYear} • 6:30 PM, Math 508 Cantor Lounge`;
        }
        if (cardSpeaker) cardSpeaker.textContent = nextLecture.speaker;
        if (cardButton) {
            cardButton.textContent = 'View Abstract';
            cardButton.onclick = () => scrollToLectureInCalendar(nextLecture);
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
        return event.title && 
               event.title.trim() !== '' && 
               event.title.trim() !== 'No Title' &&
               event.title !== '&nbsp;';
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

        eventDiv.innerHTML = `
            <div class="calendar-date">
                <div class="month-year">${monthYear}</div>
                <div class="day">${day}</div>
            </div>
            <div class="calendar-content">
                <div class="title">${event.title || 'No Title'}</div>
                <div class="speaker">${event.speaker || 'TBA'}</div>
                <div class="abstract">${event.abstract || 'No abstract available.'}</div>
            </div>
        `;

        container.appendChild(eventDiv);
    });
}

// Function to return to Fall 2025 when UMS logo is clicked
function returnToFall2025() {
    // Load Fall 2025 events and scroll to top
    loadSemesterEvents('2025_fall', false).then(() => {
        // Scroll to top of page smoothly
        window.scrollTo({ 
            top: 0, 
            behavior: 'smooth' 
        });
    });
}

// Function to load and display leadership
async function loadLeadership() {
    try {
        const response = await fetch('data/leadership.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const leaders = await response.json();
        const container = document.getElementById('leadership-container');
        
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
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
        
    } catch (error) {
        console.error('Error loading leadership:', error);
        const container = document.getElementById('leadership-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <p>Sorry, we couldn't load the leadership information.</p>
                </div>
            `;
        }
    }
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

// Initialize calendar
async function initCalendar() {
    // Load the default semester (2025 Fall) without scrolling
    await loadSemesterEvents('2025_fall', false);
    
    // Update front page lecture card after initial load (always from 2025_fall)
    await updateFrontPageLecture();
    
    // Load proof writing workshop section
    await loadProofWritingWorkshop();
    
    // Load leadership section
    await loadLeadership();
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

