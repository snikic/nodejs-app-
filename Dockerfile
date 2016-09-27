
FROM lpdocker-registry.dev.lprnd.net/lp-nodejs-base
MAINTAINER ci <ci@liveperson.com>

# - 'static constants' which will be reused below:
#   use two steps, since the env variables depend on each other
#   https://docs.docker.com/engine/userguide/eng-image/dockerfile_best-practices/#env
ENV LP_HOME="${LIVEPERSON_HOME:-/liveperson}" \
    H_TMP="${nodejs-app:-/tmp/nodejs-app}"
ENV H_CODE="${LP_HOME}/${nodejs-app_CODE:-code/nodejs-app}" \
    H_DATA="${LP_HOME}/${nodejs-app_DATA:-data/nodejs-app}"

# - create necessary folders
RUN mkdir -p ${H_DATA}/logs/ && \
    mkdir -p ${H_CODE}/

# - use dumb-init: https://github.com/Yelp/dumb-init/blob/master/README.md
RUN curl -sLo /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.1.3/dumb-init_1.1.3_amd64 && \
    chmod +x /usr/local/bin/dumb-init

# - npm dependencies:
#   this way, the dependencies will be cached. but we force Docker not to
#   use the cache when we change our application's nodejs dependencies:
COPY package.json ${H_TMP}/package.json
RUN cd ${H_TMP}/ && \
    npm install --production --only=production --no-optional && \
    npm dedupe && \
    npm cache clear && \
    mv * ${H_CODE} && \
    rm -rf ${H_TMP}/

# - copy deployment specific files, i.e. app configuration:
#   the folder structure within the 'deployment/docker/' folder is targeting the root folder
COPY deployment/docker/ /

# - copy the modules (will not be automatically installed via npm, since the docker image doesn't have git and ssh installed)
COPY node_modules/nodejs-app-modules/ ${H_CODE}/node_modules/nodejs-app-modules/

# - copy relevant files and create necessary folders (copy the project
#   source 'src' as the last content to the docker image to improve
#   build performance/caching)
COPY src/ ${H_CODE}/src/

# - setup owner and permissions + read-only access
# - but allow write access to the data folder
RUN chown -R appuser:appgrp ${LP_HOME} && \
    chmod -R 550 ${LP_HOME} && \
    chmod -R 750 ${H_DATA}

# NODE_ENV information:
# http://stackoverflow.com/a/16979503
# http://apmblog.dynatrace.com/2015/07/22/the-drastic-effects-of-omitting-node_env-in-your-express-js-applications/
USER appuser
WORKDIR ${H_CODE}
# ENV NODE_DEBUG="net,http"
CMD NODE_ENV=production dumb-init node ./src/app.js
