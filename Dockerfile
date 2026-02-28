FROM node:22.12-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
ENV DATA_MODE=api
RUN npm run build

FROM node:22.12-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3001
CMD ["node", "server/index.js"]
