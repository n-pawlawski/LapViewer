# LapViewer production image: Node 22 + ffmpeg + built client
FROM node:22-bookworm-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/

RUN npm run install:all

COPY . .

ARG GIT_SHA=unknown
ENV GIT_SHA=${GIT_SHA}

RUN npm run build

FROM node:22-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV DEPLOY_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
COPY server/package.json server/

RUN npm ci --omit=dev --prefix server

COPY --from=build /app/client/dist ./client/dist
COPY server ./server
COPY infra ./infra
COPY config/.env.example ./config/.env.example

ARG GIT_SHA=unknown
ENV GIT_SHA=${GIT_SHA}

EXPOSE 3000

CMD ["npm", "run", "start"]
