FROM alpine:latest

RUN apk add --update nodejs npm sudo

RUN addgroup -S beeline && adduser --system --home /beeline --disabled-password beeline beeline

USER beeline

RUN mkdir -p /beeline && chmod -R 755 /beeline
WORKDIR /beeline

COPY --chown=beeline:beeline package-lock.json package.json ./

RUN npm install

COPY --chown=beeline:beeline . .

RUN mkdir config && mkdir sql

ENV PATH="/beeline:${PATH}"

USER root

RUN npm link && mv /usr/local/bin/beelinedb  /usr/local/bin/beeline

USER beeline

CMD ["beeline"]
