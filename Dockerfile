FROM node:22-alpine AS build
RUN corepack enable
RUN corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build

FROM node:22-alpine
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
