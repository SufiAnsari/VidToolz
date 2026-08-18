FROM node:20-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# The task bundle may be built from a Windows checkout. Normalize the two shell
# entrypoints inside the Linux image so Bash receives LF line endings.
RUN sed -i 's/\r$//' tests/test.sh solution/solve.sh

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
