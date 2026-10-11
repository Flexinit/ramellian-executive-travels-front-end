# Production image for the frontend: Node builds the static site, Nginx serves it.
# Vite bakes VITE_* values into the bundle at build time, so they are build args, not runtime env vars.

# ─── deps: install packages once, shared by the test and build stages ───────
FROM node:20-alpine AS deps
WORKDIR /app
# Husky's git hooks are for developers' machines only.
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci

# ─── test: `docker build --target test .` runs the test suite ───────────────
FROM deps AS test
COPY . .
RUN npm test

# ─── build: produce dist/ ───────────────────────────────────────────────────
FROM deps AS build
# Temporary default: the backend straight on the VPS. Switch to the https site address once it has a certificate.
ARG VITE_API_BASE_URL=http://102.68.87.231:8090
ARG VITE_SWAGGER_URL=http://102.68.87.231:8090/swagger-ui/index.html
ARG VITE_PESAPAL_ENV=live
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_ENABLE_WHATSAPP_VERIFICATION=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SWAGGER_URL=$VITE_SWAGGER_URL \
    VITE_PESAPAL_ENV=$VITE_PESAPAL_ENV \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_ENABLE_WHATSAPP_VERIFICATION=$VITE_ENABLE_WHATSAPP_VERIFICATION
COPY . .
RUN test -n "$VITE_API_BASE_URL" || (echo "VITE_API_BASE_URL build arg is required" && exit 1)
RUN npm run build

# ─── runtime: just Nginx and the built files ────────────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx/frontend-container.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
