var api;

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

        totalIssueCount = 0;
        for (var i = 0; i < milestones.length; i++) {
            api.loadIssuesForMilestone(
                milestones[i], 
                projId,
                (a, b, c) => loadIssuesComplete(a, b, c),
                (m) => console.log("Error loading issues for milestone: " + m));
        }
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

var totalIssueCount = 0;
function loadIssuesComplete(issues, milestoneId, projectId) {
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
        var match = item.title.match(/E[0-9]+/i);
        if (match == null || match == undefined) {
            console.log("Invalid description " + item.title);
        } else {
            var estimate = match[0].substring(1, match[0].length); // get rid of the E 
            totalEstimate += parseInt(estimate);
        }
    });

    totalIssueCount += totalEstimate;
    milestoneData.push.apply(milestoneData, [{
        start: start,
        end: end,
        totalPointsCompleted: totalEstimate,
        pointsPerDay: totalEstimate / days
    }]);
    
    if (milestoneData.length == getSelectedOptions(document.getElementById("milestoneSelect")).length) {
        console.log("Total completed in milestone " + milestoneId + "\r\n\t" + totalEstimate + " in " + days + " days at " + totalEstimate / days + " points per day");
        // loadOpenIssues(projectId, totalEstimate / days, allmilestoneissuecount);
    }
}

function clearList(dropdown) {
    for (var i = 0; i < dropdown.options.length; i++) {
        dropdown.options[i] = null;
    }
}

function newOption(text, value) {
    var option = document.createElement("option");
    option.text = text;
    option.value = value;
    return option;
}

function getSelectedOptions(dropdown) {
    var items = [];
    for (var i = 0; i < dropdown.options.length; i++) {
        if (dropdown.options[i].selected) {
            items.push.apply(items, [dropdown.options[i].value]);
        }
    }

    return items;
}

function loadOpenIssues(projectId, avgperday, totalCompletedPoints) {
    console.log("Fetching open issues for project " + projectId);
    
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var issues = JSON.parse(this.responseText);
            console.log("Received " + issues.length + " open issues");

            var totalEstimate = 0;
            issues.forEach(function(item) {
                var match = item.title.match(/E[0-9]+/i);
                if (match == null || match == undefined) {
                    console.log("Invalid description " + item.title);
                } else {
                    var estimate = match[0].substring(1, match[0].length); // get rid of the E 
                    totalEstimate += parseInt(estimate);
                }
            });
            
            calculateGraph(milestoneData, totalEstimate + totalCompletedPoints);
            console.log("Open issues\r\n\t" + totalEstimate + " points remaining");
        }
    };

    xhttp.open("GET", apiUrl + '/projects/' + projectId + '/issues?state=opened', true);
    xhttp.setRequestHeader("PRIVATE-TOKEN", apiKey);
    xhttp.send();
}

var milestoneData = [];
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