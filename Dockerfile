FROM alpine:latest

RUN apk add --update nodejs yarn

RUN addgroup -S beeline && adduser --system --home /beeline --disabled-password beeline beeline

USER beeline

WORKDIR /beeline

COPY --chown=beeline:beeline yarn.lock package.json ./

RUN yarn install

COPY --chown=beeline:beeline . .

RUN mkdir config
RUN mkdir sql

ENV PATH="/beeline:${PATH}"

CMD ["node", "beeline"]
