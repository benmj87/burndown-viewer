var api; // holds the reference to gitlabAPI.js
var milestoneData = []; // the data relating to each milestone to render in the graph
var totalIssueCount = 0; // the total points calculated when loading all issues

var issueCallsCompleted = 0; // used to sync all of the calls to fetch the issues for each milestone and remaining opened issues
var expectedIssueCalls = 0; // what ^^ he said

window.onload = function() {
    loadSettings();

    document.getElementById("projectSelect").onchange = function(e) {
        $.plot("#graph", [], {}); // clear the graph
        document.getElementById("milestoneSelect").options.length = 0; // clear milestones

        api.loadMilestones(
            e.target.value, 
            (m) => loadMilestonesComplete(m), 
            (m) => console.log("Error loading milestones: " + m));
    }

    document.getElementById("milestoneSelect").onchange = function(e) {
        $.plot("#graph", [], {}); // clear the graph
        
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
    milestoneSelect.options.length = 0; // clear
    for (var i = 0; i < allMilestones.length; i++) {
        var opt = newOption(allMilestones[i].title, allMilestones[i].id);
        milestoneSelect.appendChild(opt);
    }
}

function loadIssuesComplete(issues, milestoneId, projectId) {
    issueCallsCompleted++;
    var totalEstimate = 0;
    var milestone = api.findMilestone(milestoneId);

    if (milestone.start_date == null || milestone.due_date == null) {
        console.log("Start or end date of milestone " + milestoneId + " hasn't been populated");
        return;
    }

    var start = new Date(milestone.start_date);
    var end = new Date(milestone.due_date);

    if (isNaN(start) || isNaN(end)) {
        console.log("Unable to parse start " + milestone.start_date + " or end date " + milestone.due_date);
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
        pointsPerDay: totalEstimate / days,
        name: milestone.title
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
    // all the load issue calls for each milestone and remaining open issues have returned
    if (issueCallsCompleted == expectedIssueCalls) {
        calculateGraph(milestoneData, totalIssueCount);
    }
}

function getEstimate(issue) {
    if (issue.title.match(/E([0-9]+)/i)) {
        // match E10 in the title
        return parseInt(issue.title.match(/E([0-9]+)/i)[1]);
    } else if (issue.title.match(/\[([0-9]+)\]/i)) {
        // match [10] in the title
        return parseInt(issue.title.match(/\[([0-9]+)\]/i)[1]);
    }
    
    return 0;
}

function calculateGraph(milestones, totalPoints) {
    if (milestones.length > 0 && totalPoints > 0) {
        milestones = milestones.sort((a, b) => a.start.getTime() - b.start.getTime());

        var gdata = [];
        var curpoints = totalPoints;
        var avgForProject = 0;
        var worstAvg = 0;
        var bestAvg = 0;
        var totalDays = 0;

        // calculate averages from past 3
        var start = milestones.length > 3 ? milestones.length - 3 : 0;
        for (var i = start; i < milestones.length; i++) {
            var avgperday = milestones[i].totalPointsCompleted / getDaysCount(milestones[i].start, milestones[i].end);
            if (worstAvg == 0 || worstAvg > avgperday) {
                worstAvg = avgperday;
            }
            if (avgperday > bestAvg) {
                bestAvg = avgperday;
            }

            avgForProject += avgperday;
            totalDays++;
        }

        // plot the milestones 
        for (var i = 0; i < milestones.length; i++) {
            var avgperday = milestones[i].totalPointsCompleted / getDaysCount(milestones[i].start, milestones[i].end);
            var curDate = milestones[i].start;
            while (curDate <= milestones[i].end) {
                gdata.push.apply(gdata, [[curDate.getTime(), curpoints]]);
                curpoints -= avgperday;
                curDate.setDate(curDate.getDate() + 1);
            }
        }

        avgForProject = avgForProject / totalDays;    

        var pointsRemaining = curpoints;
        var curPointsAvg = curpoints;
        var curPointsWorst = curpoints;
        var curPointsBest = curpoints;
        var incompleteAvg = [];
        var incompleteWorst = [];
        var incompleteBest = [];
        var avgCompleteDate = curDate;
        var bestCompleteDate = curDate;
        var worstCompleteDate = curDate;

        // if any points are left, estimate the remaining and plot the avg, best and worst cases
        if (curpoints > 0) {
            while (curPointsAvg > 0 || curPointsWorst > 0 || curPointsBest > 0) {
                if (curPointsAvg > 0) {
                    incompleteAvg.push.apply(incompleteAvg, [[curDate.getTime(), curPointsAvg]]);
                    curPointsAvg -= avgForProject;
                    avgCompleteDate = new Date(curDate.getTime());
                }
                if (curPointsWorst > 0) {
                    incompleteWorst.push.apply(incompleteWorst, [[curDate.getTime(), curPointsWorst]]);
                    curPointsWorst -= worstAvg;
                    worstCompleteDate = new Date(curDate.getTime());
                }
                if (curPointsBest > 0) {
                    incompleteBest.push.apply(incompleteBest, [[curDate.getTime(), curPointsBest]]);
                    curPointsBest -= bestAvg;
                    bestCompleteDate = new Date(curDate.getTime());
                }

                curDate.setDate(curDate.getDate() + 1);
            }
        }

        $.plot("#graph", [ 
            {
                data: gdata,
                label: "Completed"
            },
            {
                data: incompleteAvg,
                color: "blue",
                label: "Average (" + avgCompleteDate.getDate() + "/" + (avgCompleteDate.getMonth()+1) + "/" + avgCompleteDate.getFullYear() + ")"
            },
            {
                data: incompleteWorst,
                color: "red",
                label: "Worst (" + worstCompleteDate.getDate() + "/" + (worstCompleteDate.getMonth()+1) + "/" + worstCompleteDate.getFullYear() + ")"
            }, 
            {
                data: incompleteBest,
                color: "green",
                label: "Best (" + bestCompleteDate.getDate() + "/" + (bestCompleteDate.getMonth()+1) + "/" + bestCompleteDate.getFullYear() + ")"
            }], 
            {
                xaxis: {
                    mode: 'time',
                    timeformat: '%d/%m'
                },
                yaxis: {
                    label: "Points (" + pointsRemaining + " remaining)"
                }
            });
    }
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