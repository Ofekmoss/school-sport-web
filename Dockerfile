FROM --platform=linux/amd64 node:16 as build
ARG ENV_NAME=dev

ENV ENV_NAME=$ENV_NAME
WORKDIR /app
COPY . /app

RUN echo "deb [arch=amd64,arm64,armhf] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list && \
    curl https://packages.microsoft.com/keys/microsoft.asc | tee /etc/apt/trusted.gpg.d/microsoft.asc && \
    apt-get clean && apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql17 unixodbc-dev && apt-get clean
RUN npm i

FROM --platform=linux/amd64 node:16 
ARG ENV_NAME=dev

WORKDIR /app

COPY --from=build /app /app
COPY ./$ENV_NAME.settings.js /app/settings.js

EXPOSE 5000 5443
CMD ["npm", "start"]