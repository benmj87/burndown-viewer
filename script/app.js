var api; // holds the reference to gitlabAPI.js
var milestoneData = []; // the data relating to each milestone to render in the graph
var totalIssueCount = 0; // the total points calculated when loading all issues

var issueCallsCompleted = 0; // used to sync all of the calls to fetch the issues for each milestone and remaining opened issues
var expectedIssueCalls = 0; // what ^^ he said

window.onload = function() {
    loadSettings();

    document.getElementById("projectSelect").onchange = function(e) {
        api.loadMilestones(
            e.target.value, 
            (m) => loadMilestonesComplete(m), 
            (m) => console.log("Error loading milestones: " + m));
    }

    document.getElementById("milestoneSelect").onchange = function(e) {
        var projSel = document.getElementById("projectSelect");
        var milestones = getSelectedOptions(e.target);
        var projId = projSel.options[projSel.selectedIndex].value;

        milestoneData = [];
        totalIssueCount = 0;
        issueCallsCompleted = 0;
        expectedIssueCalls = 0;

        for (var i = 0; i < milestones.length; i++) {
            expectedIssueCalls++;
            api.loadIssues(
                milestones[i], 
                projId,
                'closed',
                (i, m, p) => loadIssuesComplete(i, m, p),
                (m) => console.log("Error loading issues for milestone: " + m) & issueCallsCompleted++);
        }

        expectedIssueCalls++;   
        api.loadIssues(
            null, 
            projId,
            'opened',
            (i, m, p) => loadOpenIssuesComplete(i, m, p),
            (m) => console.log("Error loading open issues: " + m) & issueCallsCompleted++);
    }
}

function loadSettings() {
    console.log("Loading settings from apikey.json");

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState == XMLHttpRequest.DONE && xhttp.status == 200) {
            var data = JSON.parse(xhttp.responseText);
            api = new GitlabAPI(data);
            api.loadAllProjects(
                (p) => loadProjectsComplete(p), 
                (m) => console.log("Error message: " + m));
        } else if (xhttp.readyState == XMLHttpRequest.DONE) {
            console.log("Error loading settings from apikey.json: " + xhttp.status + xhttp.statusText);
        }
    };

    xhttp.open("GET", "apikey.json", true);
    xhttp.send();
}

function loadProjectsComplete(allProjects) {
    console.log("All projects load complete, loaded " + allProjects.length);

    var projSelect = document.getElementById("projectSelect");
    for (var i = 0; i < allProjects.length; i++) {
        var opt = newOption(allProjects[i].name_with_namespace, allProjects[i].id);
        projSelect.appendChild(opt);
    }
}

function loadMilestonesComplete(allMilestones, projectId) {
    var milestoneSelect = document.getElementById("milestoneSelect");
    clearList(milestoneSelect);
    for (var i = 0; i < allMilestones.length; i++) {
        var opt = newOption(allMilestones[i].title, allMilestones[i].id);
        milestoneSelect.appendChild(opt);
    }
}

function loadIssuesComplete(issues, milestoneId, projectId) {
    issueCallsCompleted++;
    var totalEstimate = 0;
    var milestone = api.findMilestone(milestoneId);
    var start = new Date(milestone.start_date);
    var end = new Date(milestone.due_date);

    if (isNaN(start) || isNaN(end)) {
        console.log("Unable to parse start " + milestone.start_date + " or end date " + milestone.end_date);
        return;
    }

    var days = getBusinessDatesCount(start, end);
    issues.forEach(function(item) {
        totalEstimate += getEstimate(item);
    });

    totalIssueCount += totalEstimate;
    milestoneData.push.apply(milestoneData, [{
        start: start,
        end: end,
        totalPointsCompleted: totalEstimate,
        pointsPerDay: totalEstimate / days
    }]);

    checkIssuesComplete();
}

function loadOpenIssuesComplete(issues, milestoneId, projectId) {
    issueCallsCompleted++;
    var totalEstimate = 0;

    issues.forEach(function(item) {
        totalEstimate += getEstimate(item);
    });
    
    totalIssueCount += totalEstimate;
    checkIssuesComplete();
}

function checkIssuesComplete() {
    if (issueCallsCompleted == expectedIssueCalls) {
        calculateGraph(milestoneData, totalIssueCount);
    }
}

function getEstimate(issue) {
    var match = issue.title.match(/E[0-9]+/i);
    if (match == null || match == undefined) {
        console.log("Invalid description " + issue.title);
        return 0;
    } else {
        var estimate = match[0].substring(1, match[0].length); // get rid of the E 
        return parseInt(estimate);
    }
}

function calculateGraph(milestones, totalPoints) {
    milestones = milestones.sort((a, b) => a.start > b.start);
    var gdata = [];
    var incomplete = [];
    var curpoints = totalPoints;

    for (var i = 0; i < milestones.length; i++) {
        var avgperday = milestones[i].totalPointsCompleted / getDaysCount(milestones[i].start, milestones[i].end);
        var curDate = milestones[i].start;
        while (curDate <= milestones[i].end) {
            gdata.push.apply(gdata, [[curDate.getTime(), curpoints]]);
            curpoints -= avgperday;
            curDate.setDate(curDate.getDate() + 1);
        }
    }
    
    // if any points are left, estimate the remaining
    if (curpoints >0) {
        var today = new Date();
        while (curDate < today) {
            incomplete.push.apply(incomplete,[[curDate.getTime(), curpoints]]);
            curDate.setDate(curDate.getDate() + 1);
        }

        while (curpoints > 0) {
            incomplete.push.apply(incomplete, [[curDate.getTime(), curpoints]]);
            curpoints -= avgperday;
            curDate.setDate(curDate.getDate() + 1);
        }
    }

    $.plot("#graph", [ gdata, incomplete ], {
        xaxis: {
            mode: 'time',
            minTickSize: [1, 'day'],
            timeformat: '%d/%m/%y'
        }
    });
}

// yoink: http://stackoverflow.com/questions/29933608/how-to-calculate-the-total-days-between-two-selected-calendar-dates
function getBusinessDatesCount(startDate, endDate) {
    var count = 0;
    var curDate = new Date(startDate);
    while (curDate <= endDate) {
        var dayOfWeek = curDate.getDay();
        if(!((dayOfWeek == 6) || (dayOfWeek == 0)))
           count++;
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
}

// yoink: http://stackoverflow.com/questions/29933608/how-to-calculate-the-total-days-between-two-selected-calendar-dates
function getDaysCount(startDate, endDate) {
    var count = 0;
    var curDate = new Date(startDate);
    while (curDate <= endDate) {
        var dayOfWeek = curDate.getDay();
        count++;
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
}