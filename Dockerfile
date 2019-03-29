FROM buildkite/puppeteer
LABEL maintainer="Jurien Hamaker <jurien@kings-dev.io>"

WORKDIR /opt/app
VOLUME [ "/opt/app/exports" ]

COPY package.json package-lock.json /opt/app/
RUN npm i
COPY ./ /opt/app/

ENTRYPOINT ["npm"]
CMD ["start"]