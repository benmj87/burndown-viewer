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
        var milestone = findMilestone(e.target.value);

        loadIssuesForMilestone(e.target.value, sel.options[sel.selectedIndex].value, milestone);
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

function loadMilestones(id) {
    console.log("Fetching milestones for project " + id);
    var xhttp = new XMLHttpRequest();
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

    xhttp.open("GET", apiUrl + '/projects/' + id + '/milestones', true);
    xhttp.setRequestHeader("PRIVATE-TOKEN", apiKey);
    xhttp.send();
}

function newOption(text, value) {
    var option = document.createElement("option");
    option.text = text;
    option.value = value;
    return option;
}

function loadIssuesForMilestone(milestoneId, projectId, milestone) {
    console.log("Fetching issues for milestone " + milestoneId + " and project " + projectId);
    console.log("Milestone info: " + milestone);
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var issues = JSON.parse(this.responseText);
            console.log("Received " + issues.length + " issues");

            var totalEstimate = 0;
            var days = 10;
            issues.forEach(function(item) {
                var match = item.title.match(/E[0-9]+/i);
                if (match == null || match == undefined) {
                    console.log("Invalid description " + item.title);
                } else {
                    var estimate = match[0].substring(1, match[0].length); // get rid of the E                
                    console.log(item.title);
                    console.log(estimate);
                    totalEstimate += parseInt(estimate);
                }
            });

            
            console.log("Total completed in milestone " + milestoneId + "\r\n\t" + totalEstimate + " in " + days + " days at " + totalEstimate / days + " points per day");
        }
    };

    xhttp.open("GET", apiUrl + '/projects/' + projectId + '/milestones/' + milestoneId + '/issues', true);
    xhttp.setRequestHeader("PRIVATE-TOKEN", apiKey);
    xhttp.send();
}