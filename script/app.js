var apiKey = "";
var apiUrl = "";

window.onload = function() {
    loadSettings();
    document.getElementById("projectSelect").onchange = function(e) {
        allMilestones = [];
        loadMilestones(e.target.value);
    }

    document.getElementById("milestoneSelect").onchange = function (e) {
        var sel = document.getElementById("projectSelect");
        var milestones = selectedOptions(e.target);

        allmilestoneissuecount = 0;
        milestoneData = [];
        for (var i = 0; i < milestones.length; i++) {
            var milestone = findMilestone(milestones[i]);
            loadIssuesForMilestone(milestones[i], sel.options[sel.selectedIndex].value, milestone);
        }
    }
}

function findMilestone(id) {
    for (var i = 0; i < allMilestones.length; i++) {
        if (allMilestones[i].id == id) {
            return allMilestones[i];
        }
    }
    
    return null;
}

function loadSettings() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var data = JSON.parse(this.responseText);
            apiKey = data.apiKey;
            apiUrl = data.url;
            loadAllProjects();
        }
    };

    xhttp.open("GET", "apikey.json", true);
    xhttp.send();
}

var currentPage = 0;
var allProjects = [];
var allMilestones = [];

function loadAllProjects() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var projects = JSON.parse(this.responseText);
            console.log("loaded page " + currentPage + " of projects");
            allProjects.push.apply(allProjects, projects);

            if (projects.length > 0) {
                currentPage++;
                loadAllProjects()
            } else {
                loadProjectsComplete();
            }
        }
    };

    xhttp.open("GET", apiUrl + '/projects/all?page=' + currentPage, true);
    xhttp.setRequestHeader("PRIVATE-TOKEN", apiKey);
    xhttp.send();
}

function loadProjectsComplete() {
    console.log("All projects load complete, loaded " + allProjects.length);

    allProjects.sort(function(a, b) {
        return a.name_with_namespace.localeCompare(b.name_with_namespace);
    });

    var projSelect = document.getElementById("projectSelect");
    for (var i = 0; i < allProjects.length; i++) {
        var opt = newOption(allProjects[i].name_with_namespace, allProjects[i].id);
        projSelect.appendChild(opt);
    }

    projSelect.value = 46; // for debugging select pl2
    loadMilestones(46);
}

function clearList(dropdown) {
    for (var i = 0; i < dropdown.options.length; i++) {
        dropdown.options[i] = null;
    }
}

function loadMilestones(id) {
    console.log("Fetching milestones for project " + id);
    var xhttp = new XMLHttpRequest();
    clearList(document.getElementById("milestoneSelect"));
    xhttp.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var milestones = JSON.parse(this.responseText);
            allMilestones.push.apply(allMilestones, milestones);
            var milestoneSelect = document.getElementById("milestoneSelect");

            for (var i = 0; i < milestones.length; i++) {
                var opt = newOption(milestones[i].title, milestones[i].id);
                milestoneSelect.appendChild(opt);
            }
        }
    };

    xhttp.open("GET", apiUrl + '/projects/' + id + '/milestones?state=closed', true);
    xhttp.setRequestHeader("PRIVATE-TOKEN", apiKey);
    xhttp.send();
}

function newOption(text, value) {
    var option = document.createElement("option");
    option.text = text;
    option.value = value;
    return option;
}

var allmilestoneissuecount = 0;
function loadIssuesForMilestone(milestoneId, projectId, milestone) {
    console.log("Fetching issues for milestone " + milestoneId + " and project " + projectId);
    
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var issues = JSON.parse(this.responseText);
            console.log("Received " + issues.length + " issues");

            var totalEstimate = 0;
            var start = new Date(milestone.start_date);
            var end = new Date(milestone.due_date);

            if (isNaN(start) || isNaN(end)) {
                console.log("Unable to parse start " + milestone.start_date + " or end date " + milestone.end_date);
                return;
            }

            var days = getBusinessDatesCount(start, end);
            console.log("Businss days in milestone: " + days);

            issues.forEach(function(item) {
                var match = item.title.match(/E[0-9]+/i);
                if (match == null || match == undefined) {
                    console.log("Invalid description " + item.title);
                } else {
                    var estimate = match[0].substring(1, match[0].length); // get rid of the E 
                    totalEstimate += parseInt(estimate);
                }
            });

            allmilestoneissuecount += totalEstimate;
            milestoneData.push.apply(milestoneData, [{
                start: start,
                end: end,
                totalPointsCompleted: totalEstimate,
                pointsPerDay: totalEstimate / days
            }]);
            
            if (milestoneData.length == selectedOptions(document.getElementById("milestoneSelect")).length) {
                console.log("Total completed in milestone " + milestoneId + "\r\n\t" + totalEstimate + " in " + days + " days at " + totalEstimate / days + " points per day");
                loadOpenIssues(projectId, totalEstimate / days, allmilestoneissuecount);
            }
        }
    };

    xhttp.open("GET", apiUrl + '/projects/' + projectId + '/milestones/' + milestoneId + '/issues?state=closed', true);
    xhttp.setRequestHeader("PRIVATE-TOKEN", apiKey);
    xhttp.send();
}

function selectedOptions(dropdown) {
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