class GitlabAPI {    
    constructor(config) {
        this.apiKey = config.apiKey;
        this.apiUrl = config.url;

        this.allProjects = [];
        this.currentProjectPage = 0;
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
}