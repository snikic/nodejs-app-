'use strict';

define(['auth/storage', 'navigation/frame', 'ui/state', 'ui/search', 'state/data', 'util/util', 'xssFilters'], (storage, frame, ui, search, data, util, xssFilters) => {
    const _addEventListener = callback => window.addEventListener('popstate', callback);

    const _baseTitle = document.title;

    let currentModule;

    const _getModuleData = event => {
        const moduleData = event && event.state
            ? event.state
            : {};
        // path = basePath + modulePath
        moduleData.path = moduleData.path || window.location.pathname;
        moduleData.hash = window.location.hash;
        moduleData.title = moduleData.title || document.title;
        moduleData.basePath = moduleData.basePath || util.getBasePath();
        const urlModuleData = util.getModuleData(); // module data from url
        if (urlModuleData) {
            moduleData.name = moduleData.name || urlModuleData[1];
            moduleData.subPath = urlModuleData[2];
            moduleData.modulePath = moduleData.modulePath || `/module/${moduleData.name}/`;
        }

        moduleData.modulePath = moduleData.modulePath || '/'; // e.g. on the start/home page

        return moduleData;
    };

    const _handleAnalytics = moduleData => {
        if (window.analytics && moduleData.modulePath) {
            const analytics = window.analytics;
            // https://developers.google.com/analytics/devguides/collection/analyticsjs/single-page-applications
            analytics('set', 'page', moduleData.modulePath);
            // 'location' and 'referrer' should not be updated in single page applications
            analytics('send', 'pageview');
        }
    };

    const _navigateToModule = event => {
        const moduleData = _getModuleData(event);

        // handle start/home page
        if (moduleData.name === 'home' || moduleData.path === `${util.getBasePath()}/`) {
            currentModule = 'home';
            _handleAnalytics(moduleData);
            return ui.update();
        }

        // check if we are already on the "correct" module page... if so, we don't need to change/reload
        // (this also fixes navigation for modules which use the hash for navigation)
        if (moduleData.name === currentModule) return null;

        // handle modules
        if (moduleData.name) {
            currentModule = moduleData.name;
            // XSS protection: https://github.com/yahoo/xss-filters/wiki#inunquotedattrs--string
            const token = xssFilters.inUnQuotedAttr(storage.getToken());
            const account = xssFilters.inUnQuotedAttr(storage.getSiteId());
            const user = xssFilters.inUnQuotedAttr(storage.getUserId());
            const basePath = `${util.getBasePath()}/module/${moduleData.name}`;
            const contentPath = xssFilters.inUnQuotedAttr(`${basePath}/`);

            _handleAnalytics(moduleData);

            // remove readme switcher (if any)
            $('#readme-switcher').remove();

            const config = {
                'headers': {
                    'X-LP-ACCOUNT': account,
                    'X-LP-TOKEN': token,
                    'X-LP-USER': user
                },
                'method': 'POST'
            };

            return data.getModule(`${artifactId}-module-${moduleData.name}`)
                .then(module => {
                    const useIFrame = module.${artifactId}.iFrame;
                    const moduleContainer = ui.showModule(useIFrame);

                    if (useIFrame === true) {
                        // minimal valid HTML5 to load the module via form and 'post' before the DOM is actually loaded
                        const html = `<!DOCTYPE html><html><meta charset=utf-8><title>.</title><form id=f action=${contentPath} method=POST><input type=hidden name=token value=${token}><input type=hidden name=account value=${account}><input type=hidden name=user value=${user}></form><script>document.getElementById('f').submit();</script>`;
                        moduleContainer.setAttribute('srcdoc', html);
                        const iFrameLoaded = () => {
                            frame.initFrame(moduleContainer);
                            moduleContainer.removeAttribute('srcdoc');
                            moduleContainer.setAttribute('sandbox', data.getSandboxProperties()); // remove 'allow-form'
                            moduleContainer.removeEventListener('load', iFrameLoaded);
                        };
                        moduleContainer.addEventListener('load', iFrameLoaded);
                    } else {
                        fetch(contentPath, config)
                            .then(response => {
                                if (response.ok === true) return response;
                                throw new Error(`Failed to get module app.core.xhtml. Server returned status code: ${response.status}`);
                            })
                            .then(response => response.text())
                            .then(html => {
                                // const root = moduleContainer.createShadowRoot();
                                // root.applyAuthorStyles = true; // TODO: make this configurable
                                // const template = document.createElement('template');
                                // template.innerHTML = html;
                                // root.appendChild(document.importNode(template.content, true));
                                $(moduleContainer).html(html); // TODO: super temp!
                            })
                            .catch(error => console.error(error));
                    }

                    ui.update(module);
                });
        }
        return null;
    };

    window.ready(_navigateToModule);

    return {
        'init': () => {
            _addEventListener(_navigateToModule);
            return Promise.resolve();
        },
        'addNavChangeListener': callback => _addEventListener(callback),
        'goToModule': moduleName => {
            const basePath = util.getBasePath();
            const modulePath = `/module/${moduleName}/`;

            const state = { // don't change the name!
                'name': moduleName,
                'title': `${_baseTitle} - ${moduleName}`,
                'path': basePath + modulePath,
                basePath,
                modulePath
            };
            history.pushState(state, state.title, state.path); // does not trigger event!
            _navigateToModule({state}); // so lets trigger the method manually
        },
        'goToHome': () => {
            const basePath = util.getBasePath();
            const modulePath = '/';

            const state = { // don't change the name!
                'name': 'home',
                'title': _baseTitle,
                'path': basePath + modulePath,
                basePath,
                modulePath
            };
            history.pushState(state, state.title, state.path); // does not trigger event!
            _navigateToModule({state}); // so lets trigger the method manually
        }
    };
});
