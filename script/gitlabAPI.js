class GitlabAPI {    
    constructor(config) {
        this.apiKey = config.apiKey;
        this.apiUrl = config.url;

        this.allProjects = [];
        this.currentProjectPage = 0;

        this.allMilestones = [];
    }

    loadAllProjects(success, error) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState == XMLHttpRequest.DONE && xhttp.status == 200) {
                var projects = JSON.parse(xhttp.responseText);
                console.log("loaded page " + this.currentProjectPage + " of projects");
                this.allProjects.push.apply(this.allProjects, projects);

                if (projects.length > 0) {
                    this.currentProjectPage++;
                    this.loadAllProjects(success, error)
                } else {                    
                    this.allProjects.sort((a, b) => a.name_with_namespace.localeCompare(b.name_with_namespace));
                    success(this.allProjects);
                }
            } else if (xhttp.readyState == XMLHttpRequest.DONE) {
                error(xhttp.status + xhttp.statusText);
            }
        };

        xhttp.open("GET", this.apiUrl + '/projects/all?page=' + this.currentProjectPage, true);
        xhttp.setRequestHeader("PRIVATE-TOKEN", this.apiKey);
        xhttp.send();
    }
    
    loadMilestones(projectId, success, error) {
        console.log("Fetching milestones for project " + projectId);

        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState == XMLHttpRequest.DONE && xhttp.status == 200) {
                var milestones = JSON.parse(xhttp.responseText);
                this.allMilestones.push.apply(this.allMilestones, milestones);
                success(this.allMilestones, projectId);
            } else if (xhttp.readyState == XMLHttpRequest.DONE) {
                error(xhttp.status + xhttp.statusText);
            }
        };

        xhttp.open("GET", this.apiUrl + '/projects/' + projectId + '/milestones?state=closed', true);
        xhttp.setRequestHeader("PRIVATE-TOKEN", this.apiKey);
        xhttp.send();
    }

    findMilestone(milestoneId) {
        for (var i = 0; i < this.allMilestones.length; i++) {
            if (this.allMilestones[i].id == milestoneId) {
                return this.allMilestones[i];
            }
        }
    
        return null;
    }

    loadIssuesForMilestone(milestoneId, projectId, success, error) {
        console.log("Fetching issues for milestone " + milestoneId + " and project " + projectId);
        
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
                var issues = JSON.parse(this.responseText);
                console.log("Received " + issues.length + " issues");
                success(issues, milestoneId, projectId);                
            } else if (xhttp.readyState == XMLHttpRequest.DONE) {
                error(xhttp.status + xhttp.statusText);
            }
        };

        xhttp.open("GET", this.apiUrl + '/projects/' + projectId + '/milestones/' + milestoneId + '/issues?state=closed', true);
        xhttp.setRequestHeader("PRIVATE-TOKEN", this.apiKey);
        xhttp.send();
    }
}