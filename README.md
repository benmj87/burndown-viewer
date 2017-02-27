# burndown-viewer
Project to view the burndown from a suitable json feed. Currently only a GitLab feed is supported and connected through the apikey.json file. 

## Configuration
All configuration is done through the apikey.json file. The only two options are:

 * url - The gitlab url to point to.
 * apikey - The gitlab apikey. Currently working as a 'Personal Access Token' in a users profile.

 ## Startup
 To start, just serve the web folder up in a suitable file server and access `/index.html`. This will then try and grab apikey.json (n.b. A suitable MIME type might need to be added for IIS).

 ## Hosting
 To start hosting, call `docker-compose up -d --build` and the site will be accessible on :8080 of the host.