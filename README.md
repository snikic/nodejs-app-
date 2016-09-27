'nodejs-app'
========
[

> 'nodejs-app' app

Overview
---------------


Requirements
---------------



When you are interested in developing nodejs-app modules (or just want to run nodejs-app locally):

* Docker and Docker Compose. Both are part of the [Docker Toolbox](https://www.docker.com/products/docker-toolbox)

Getting Started
---------------

Updating
---------------

Running LP-'nodejs-app' locally
---------------

**Note**: Before starting 'nodejs-app', make sure you are within the LivePerson network or connected via VPN!

To start 'nodejs-app' simple run (from within the cloned folder):
```sh
node ./src/app.js
```
The node.js server now listens on the following port by default:

* http: 10080


To to speed up the configuration and setup required for the local development, we developed the so called 'nodejs-app' Local Development Kit (LDK). It automates the following required steps:

* Provide SSL offloading (usually done by Nginx if 'nodejs-app' is deployed on servers)
* Port forwarding
* Adding the 'nodejs-app.dev.lprnd.net-->127.0.0.1' mapping to the hosts file
* ...

You should leave the LDK running in a seperate terminal/console while you are locally developing. From within the project folder, call (*with admin/root privileges!*):

```sh
node debug/nodejs-app-ldk.js
```

You can quit the LDK (e.g. by closing the terminal/console) afterwards. More information can be found in the Wiki article about the [LDK](https://lpgithub.dev.lprnd.net/RnD-Mannheim/'nodejs-app'/wiki/The-Local-Development-Kit-(LDK)).

Note: if you are running nodejs-app locally from command line you still need to run (in parallel to running
`nodejs-app-ldk.js` with admin/root privileges):

```sh
node ./src/app.js
```


While we stongly suggest that you stick with the LDK... if don't want to use the automatic way to setting up everything, you can do all steps like port forwarding and `hosts` file setup manually...


You need to forward the http/https ports to the standard port numbers to use the application properly. The following scripts are available to do so:

- OSX (Mavericks): [forward-ports.app.zip](https://drive.google.com/open?id=0Bwq9qXKZ746PZ0RUQkU3V0dUam8&authuser=0), [remove-forward-ports.app.zip](https://drive.google.com/open?id=0Bwq9qXKZ746PSm1qUzVRVEo3amc&authuser=0)
- [OSX Yosemite](http://abetobing.com/blog/port-forwarding-mac-os-yosemite-81.html)

The quickest way to enable port forwarding on OS X 10.10.3 (Yosemite) is to open Terminal and enter:
```sh
echo "
rdr pass inet proto tcp from any to any port 80 -> 127.0.0.1 port 10080
rdr pass inet proto tcp from any to any port 443 -> 127.0.0.1 port 10443
" | sudo pfctl -ef -
```

To __deactivate__ OS X 10.10.3 (Yosemite) port forwarding:
```sh
sudo pfctl -d
```


The ``nodejs-app.dev.lprnd.net`` domain usually resolve all requests to QA nodejs-app.
To access the local server via
[https://nodejs-app.dev.lprnd.net](https://nodejs-app.dev.lprnd.net), you have to resolve the domain `nodejs-app.dev.lprnd.net` to `127.0.0.1`.

On Mac OS X:
* Edit the `sudo nano /etc/hosts` and add the line `127.0.0.1 localhost.dev.lprnd.net`
* Save with ctrl+o

On Windows 7:
* Click Start > All Programs > Accessories.
* Right-click Notepad and select Run as administrator.
* When Notepad opens, click File > Open.
* Open `C:\Windows\System32\Drivers\etc\hosts`.
* Make the necessary changes to the file.
* Click File > Save to save your changes.

Browser Support
-------------

Since 'nodejs-app' is an internal LivePerson project, only a small number of browsers are supported. Officially supported is the current stable version of Chrome. The latest stable version of Firefox should work fine also, but is not always tested. The application and it's modules adherence to current (or soon to be) web standards supported by Chrome at the moment of development.

Developing against the latest standards and reducing the number of supported browsers heavily reduces the required testing effort to develop 'nodejs-app' itself as well as simplifies writing modules (and this is on of the goals of this project... make writing and integrating modules as simple as possible). As soon as other browsers support the web standards as well, they will work fine as well.

If you find an issue, please [report](../../issues/new) the issue and include the following information:

* The browser (version);
* The url on which the issue occurred;
* How the issue can be replicated;
* What should actually happen;
* If it's a visual issue, please also provide a screen shot.

Build a module for nodejs-app
-------------

Before you start developing a nodejs-app module, check out the following resources:

* Getting started [Wiki](https://lpgithub.dev.lprnd.net/RnD-Mannheim/'nodejs-app'/wiki)

**Important:** If you want to work with local modules, you must [enable the *debug mode*](https://lpgithub.dev.lprnd.net/RnD-Mannheim/'nodejs-app'-app/wiki/Getting%20started#step-2-create-a-config-file) of nodejs-app. Otherwise, [only production modules](https://lpgithub.dev.lprnd.net/RnD-Mannheim/'nodejs-app'-app/wiki/Getting-started#step-9-enable-your-nodejs-app-module) are loaded.

Running 'nodejs-app' via Docker
---------------

For general howto Docker information, please view the [Docker Userguide](http://docs.docker.com/engine/userguide/basics/) on the official webpage.

To build and run the project locally, use the following standard Docker commands from within the cloned project root folder:

```sh
git clone https://lpgithub.dev.lprnd.net/RnD-Mannheim/'nodejs-app'.git
cd 'nodejs-app'
docker build -t="'nodejs-app'-app" .
docker run -i -t -p 10080:10080 'nodejs-app'-app
```

You can also run the latest build from TeamCity by using:

```sh
docker run -i -t -p 10080:10080 lpdocker-registry.dev.lprnd.net/'nodejs-app'-app:<version>
```

This downloads the specified version and starts the Docker image afterwards. The ``<version>`` must be specified as ``${maven.project.version}-${build.number}`` (without the brackets <>), e.g. [``1.0.0.0-SNAPSHOT_300``](http://tlvci.tlv.lpnet.com/viewLog.html?buildId=1461656&tab=buildResultsDiv&buildTypeId=RnD_Mannheim_Lpnodejs-appApp). Please check the [TeamCity project](http://tlvci.tlv.lpnet.com/viewType.html?buildTypeId=RnD_Mannheim_Lpnodejs-appApp) for the latest version.

Reference:
* docker [build](https://docs.docker.com/engine/reference/commandline/build/)
* docker [run](https://docs.docker.com/engine/reference/commandline/run/)

Troubleshooting
---------------
If when you sign in you get signed in to `le2-studio` and not `nodejs-app` then use the following url in QA to directly sign in to *nodejs-app* with `lpservice=leBackofficeInt`:  https://qtvr-auth01.dev.lprnd.net/login.html?lpservice=leBackofficeInt&servicepath=a%2F~~accountid~~%2F%23%2C~~ssokey~~

If you get your connection is not private (SSL issues in Chrome) and under the advanced tab you don't have any option to continue anyway and the reason is "...right now because the website uses [HSTS](https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security)".  
Browse to "*chrome://net-internals/#hsts*" and delete the domain.


Contact
-------------

* Write to the nodejs-app mailing list: nodejs-app-lp@liveperson.com
* Join the slack channel: [#nodejs-app-project](https://nation.slack.com/messages/nodejs-app-project)
# nodejs-app-
