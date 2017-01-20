var apiKey = "";
var apiUrl = "";

window.onload = function() {
    loadSettings();
    document.getElementById("projectSelect").onchange = function(e) {
        loadMilestones(e.target.value);
    }

    document.getElementById("milestoneSelect").onchange = function (e) {
        var sel = document.getElementById("projectSelect");
        loadIssuesForMilestone(e.target.value, sel.options[sel.selectedIndex].value);
    }
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

    for (var i = 0; i < allProjects.length; i++) {
        var opt = newOption(allProjects[i].name_with_namespace, allProjects[i].id);
        document.getElementById("projectSelect").appendChild(opt);
    }
}

function loadMilestones(id) {
    console.log("Fetching milestones for project " + id);
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var milestones = JSON.parse(this.responseText);
            for (var i = 0; i < milestones.length; i++) {
                var opt = newOption(milestones[i].title, milestones[i].id);
                document.getElementById("milestoneSelect").appendChild(opt);
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

function loadIssuesForMilestone(milestoneId, projectId) {
    console.log("Fetching issues for milestone " + milestoneId + " and project " + projectId);
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var issues = JSON.parse(this.responseText);
            console.log("Received " + issues.length + " issues");
        }
    };

    xhttp.open("GET", apiUrl + '/projects/' + projectId + '/milestones/' + milestoneId + '/issues', true);
    xhttp.setRequestHeader("PRIVATE-TOKEN", apiKey);
    xhttp.send();
}