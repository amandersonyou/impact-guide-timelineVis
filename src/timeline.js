// Timeline Visualization Configuration
const config = {
    margin: { top: 80, right: 100, bottom: 80, left: 100 },
    width: 1200,
    timelineLineOffset: 300, // Position of timeline from left
    milestoneRadius: 8,
    yearEndpointRadius: 6,
    colors: {
        timeline: '#2c3e50',
        milestone: '#3498db',
        milestoneActive: '#e74c3c',
        text: '#34495e'
    },
    categoryColors: {
        'Founding': '#1D315F',
        'Financial Milestones': '#B5704B',
        'Collaborations and Workshops': '#CEC1B4',
        'Team Expansion': '#6DB357',
        'Knowledge Expansion': '#D5E398',
        'Project Developments': '#D3E5EF',
        'Publications and Media': '#EAB942'
    }
};

// Global variables
let svg, timelineGroup, milestones, yScale;
let currentActiveIndex = -1;

/**
 * Initialize the visualization
 */
async function init() {
    try {
        // Load the CSV data
        const data = await loadData();
        
        // Create SVG and setup scales
        setupVisualization(data);
        
        // Draw the timeline
        drawTimeline(data);
        
        // Setup scroll interactions
        setupScrollytelling(data);
        
        console.log('Timeline visualization initialized successfully');
    } catch (error) {
        console.error('Error initializing visualization:', error);
        displayError(error.message);
    }
}

/**
 * Load data from CSV file
 * Expected CSV columns: date, title, description, category (optional)
 */
async function loadData() {
    const csvPath = '../data/milestones.csv';
    
    try {
        const data = await d3.csv(csvPath, d => {
            return {
                date: new Date(d.date),
                title: d.title,
                description: d.description,
                category: d.category || 'General'
            };
        });
        
        // Sort by date
        data.sort((a, b) => a.date - b.date);
        
        if (data.length === 0) {
            throw new Error('No data found in CSV file');
        }
        
        return data;
    } catch (error) {
        throw new Error(`Failed to load data: ${error.message}`);
    }
}

/**
 * Setup SVG canvas and scales
 */
function setupVisualization(data) {
    const container = d3.select('#visualization-container');
    
    // Clear any existing content
    container.selectAll('*').remove();
    
    // Calculate height based on data - from earliest to end of 2026
    const startDate = new Date(2021, 0, 1);
    const endDate = new Date(2027, 0, 1);
    const yearHeight = 1200;
    const year2021Height = 150; // Shorter space for 2021
    
    // Calculate total height: 2021 line + gap + 5 years of lines + gaps between them
    // Each non-2021 year has (yearHeight - 100) for line, then 100px gap
    const year2021LineHeight = 100;
    const otherYearLineHeight = yearHeight - 100;
    const gapBetweenYears = 100;
    
    const calculatedHeight = year2021LineHeight + gapBetweenYears + (otherYearLineHeight + gapBetweenYears) * 5 + config.margin.top + config.margin.bottom;
    
    // Create SVG
    svg = container
        .append('svg')
        .attr('width', config.width)
        .attr('height', calculatedHeight)
        .attr('class', 'timeline-svg');
    
    // Create main group for timeline
    timelineGroup = svg.append('g')
        .attr('class', 'timeline-group')
        .attr('transform', `translate(${config.margin.left}, ${config.margin.top})`);
}

/**
 * Draw the vertical timeline and milestones
 */
function drawTimeline(data) {
    const yearHeight = 1200; // Height allocated per year
    const year2021LineHeight = 150; // Short line for 2021
    const otherYearLineHeight = yearHeight - 100; // Line height for other years
    const gapBetweenYears = 100; // Space between end of one year line and start of next
    const years = [2021, 2022, 2023, 2024, 2025, 2026];
    const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    
    // Calculate cumulative positions for each year's line start
    const yearPositions = [0]; // 2021 starts at 0
    yearPositions.push(year2021LineHeight + gapBetweenYears); // 2022 starts after 2021 line + gap
    for (let i = 2; i < years.length; i++) {
        yearPositions.push(yearPositions[i - 1] + otherYearLineHeight + gapBetweenYears);
    }
    
    // Create scale for positioning milestones based on actual dates
    const startDate = new Date(2021, 0, 1);
    const endDate = new Date(2027, 0, 1);
    
    // Custom scale that accounts for different year heights
    yScale = (date) => {
        const year = date.getFullYear();
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year + 1, 0, 1);
        const yearProgress = (date - yearStart) / (yearEnd - yearStart);
        
        const yearIndex = year - 2021;
        if (yearIndex === 0) {
            return yearProgress * year2021LineHeight;
        } else {
            const yearStartY = yearPositions[yearIndex];
            return yearStartY + yearProgress * otherYearLineHeight;
        }
    };
    
    // Draw timeline sections for each year
    years.forEach((year, yearIndex) => {
        const yearY = yearPositions[yearIndex];
        const is2021 = year === 2021;
        const lineHeight = is2021 ? year2021LineHeight : otherYearLineHeight;
        
        // Calculate label position in the gap before this year's line
        let labelY;
        if (yearIndex === 0) {
            // 2021: place above the line start
            labelY = yearY - 30;
        } else {
            // Other years: center in the gap between previous line end and current line start
            const previousLineEnd = yearPositions[yearIndex - 1] + (yearIndex === 1 ? year2021LineHeight : otherYearLineHeight);
            labelY = (previousLineEnd + yearY) / 2;
        }
        
        // Add year label (centered in the space between year sections)
        timelineGroup.append('text')
            .attr('class', 'year-label')
            .attr('x', config.timelineLineOffset)
            .attr('y', labelY)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .text(year);
        
        // Start circle
        timelineGroup.append('circle')
            .attr('class', 'year-endpoint')
            .attr('cx', config.timelineLineOffset)
            .attr('cy', yearY)
            .attr('r', config.yearEndpointRadius);
        
        timelineGroup.append('line')
            .attr('class', 'timeline-line')
            .attr('x1', config.timelineLineOffset)
            .attr('x2', config.timelineLineOffset)
            .attr('y1', yearY)
            .attr('y2', yearY + lineHeight);
        
        // End circle
        timelineGroup.append('circle')
            .attr('class', 'year-endpoint')
            .attr('cx', config.timelineLineOffset)
            .attr('cy', yearY + lineHeight)
            .attr('r', config.yearEndpointRadius);
        
        // Add month tick marks and labels (skip for 2021)
        if (!is2021) {
            for (let month = 0; month < 12; month++) {
                const monthY = yearY + (month / 12) * lineHeight;
                
                // Month tick mark
                timelineGroup.append('line')
                    .attr('class', 'month-tick')
                    .attr('x1', config.timelineLineOffset - 10)
                    .attr('x2', config.timelineLineOffset)
                    .attr('y1', monthY)
                    .attr('y2', monthY);
                
                // Month label (first letter)
                timelineGroup.append('text')
                    .attr('class', 'month-label')
                    .attr('x', config.timelineLineOffset - 20)
                    .attr('y', monthY + 5)
                    .attr('text-anchor', 'end')
                    .text(monthNames[month]);
            }
        }
    });
    
    // Create milestone groups (positioned based on actual dates now)
    milestones = timelineGroup.selectAll('.milestone')
        .data(data)
        .join('g')
        .attr('class', 'milestone')
        .attr('transform', d => `translate(${config.timelineLineOffset}, ${yScale(d.date)})`)
        .attr('opacity', 0.3); // Start semi-transparent
    
    // Add squares for milestones with category colors
    milestones.append('rect')
        .attr('class', 'milestone-marker')
        .attr('x', -config.milestoneRadius)
        .attr('y', -config.milestoneRadius)
        .attr('width', config.milestoneRadius * 2)
        .attr('height', config.milestoneRadius * 2)
        .attr('fill', d => config.categoryColors[d.category] || config.colors.milestone);
    
    // Add title labels (right side)
    milestones.append('text')
        .attr('class', 'milestone-title')
        .attr('x', 20)
        .attr('y', 0)
        .attr('text-anchor', 'start')
        .text(d => d.title);
    
    // Add description labels (right side, below title)
    milestones.append('text')
        .attr('class', 'milestone-description')
        .attr('x', 20)
        .attr('y', 20)
        .attr('text-anchor', 'start')
        .each(function(d) {
            // Wrap long text
            wrapText(d3.select(this), d.description, 400);
        });
}

/**
 * Setup scrollytelling interactions
 */
function setupScrollytelling(data) {
    // Use Intersection Observer API for better performance
    const observerOptions = {
        root: null,
        rootMargin: '-50% 0px -50% 0px', // Trigger when milestone is in center of viewport
        threshold: 0
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const milestone = d3.select(entry.target);
            const index = +milestone.attr('data-index');
            
            if (entry.isIntersecting) {
                activateMilestone(index);
            }
        });
    }, observerOptions);
    
    // Observe each milestone
    milestones.each(function(d, i) {
        d3.select(this).attr('data-index', i);
        observer.observe(this);
    });
    
    // Alternative: scroll event listener (fallback)
    window.addEventListener('scroll', () => {
        updateTimelineOnScroll(data);
    });
}

/**
 * Activate a milestone (highlight it)
 */
function activateMilestone(index) {
    if (currentActiveIndex === index) return;
    
    currentActiveIndex = index;
    
    // Update all milestones
    milestones.each(function(d, i) {
        const milestone = d3.select(this);
        const isActive = i === index;
        const isPast = i < index;
        
        // Animate opacity and scale
        milestone.transition()
            .duration(300)
            .attr('opacity', isActive ? 1 : isPast ? 0.6 : 0.3);
        
        // Update circle color
        milestone.select('.milestone-marker')
            .transition()
            .duration(300)
            .attr('fill', isActive ? config.colors.milestoneActive : config.colors.milestone)
            .attr('r', isActive ? config.milestoneRadius * 1.5 : config.milestoneRadius);
    });
}

/**
 * Update timeline based on scroll position
 */
function updateTimelineOnScroll(data) {
    const scrollY = window.scrollY || window.pageYOffset;
    const windowHeight = window.innerHeight;
    const centerY = scrollY + windowHeight / 2;
    
    // Find which milestone is closest to center of viewport
    let closestIndex = 0;
    let minDistance = Infinity;
    
    milestones.each(function(d, i) {
        const bbox = this.getBoundingClientRect();
        const milestoneY = scrollY + bbox.top;
        const distance = Math.abs(milestoneY - centerY);
        
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
        }
    });
    
    activateMilestone(closestIndex);
}

/**
 * Wrap text to fit within a specified width
 */
function wrapText(textElement, text, maxWidth) {
    const words = text.split(/\s+/);
    let line = [];
    let lineNumber = 0;
    const lineHeight = 1.2; // ems
    const y = textElement.attr('y');
    const dy = 0;
    
    textElement.text('');
    
    let tspan = textElement.append('tspan')
        .attr('x', textElement.attr('x'))
        .attr('y', y)
        .attr('dy', dy + 'em');
    
    words.forEach(word => {
        line.push(word);
        tspan.text(line.join(' '));
        
        if (tspan.node().getComputedTextLength() > maxWidth) {
            line.pop();
            tspan.text(line.join(' '));
            line = [word];
            tspan = textElement.append('tspan')
                .attr('x', textElement.attr('x'))
                .attr('y', y)
                .attr('dy', ++lineNumber * lineHeight + dy + 'em')
                .text(word);
        }
    });
}

/**
 * Display error message to user
 */
function displayError(message) {
    const container = d3.select('#visualization-container');
    container.selectAll('*').remove();
    
    container.append('div')
        .attr('class', 'error-message')
        .style('padding', '20px')
        .style('color', '#e74c3c')
        .style('background', '#fadbd8')
        .style('border', '1px solid #e74c3c')
        .style('border-radius', '5px')
        .style('margin', '20px')
        .html(`
            <h3>Error Loading Timeline</h3>
            <p>${message}</p>
            <p>Please ensure a CSV file exists at <code>data/milestones.csv</code> with columns: date, title, description</p>
        `);
}

// Initialize the visualization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
