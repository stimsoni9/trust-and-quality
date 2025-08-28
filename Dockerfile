FROM node:18-alpine AS base
WORKDIR /app

FROM base AS deps
RUN corepack enable
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --silent

FROM deps AS build
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY apps ./apps
COPY libs ./libs
RUN yarn build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json
COPY --from=build /app/dist ./dist
# Ensure runtime has the authorities JSON alongside compiled files
COPY --from=build /app/apps/licencing/src/modules/setup/imports/licensing_authorities.json /app/dist/apps/licencing/src/modules/setup/licencing/licensing_authorities.json
# Ensure runtime has the ABN conditions JSON alongside compiled files
COPY --from=build /app/apps/licencing/src/modules/setup/imports/example_nsw_abn_conditions_multiple.json /app/dist/apps/licencing/src/modules/setup/licencing/imports/example_nsw_abn_conditions_multiple.json
EXPOSE 3001
CMD ["node", "dist/apps/licencing/src/main.js"]

