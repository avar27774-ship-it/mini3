FROM node:22-alpine

# Required for bcrypt (native C++ module)
RUN apk add --no-cache python3 make g++

RUN npm install -g pnpm@9

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

# Build frontend
RUN pnpm --filter @workspace/minions-market run build

# Build API
RUN pnpm --filter @workspace/api-server run build

# Copy frontend dist into API public folder
RUN cp -r artifacts/minions-market/dist artifacts/api-server/public

EXPOSE 3000

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
