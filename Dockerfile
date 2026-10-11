# Production image for the frontend: Node builds the static site, Nginx serves it. Built and published by GitHub
# Actions (.github/workflows/frontend-image.yml), which also runs the tests; the VPS only pulls the result.
# Vite bakes VITE_* values into the bundle at build time, so they are build args, not runtime env vars.

# ─── deps: install packages (cached until package-lock.json changes) ────────
FROM node:20-alpine AS deps
WORKDIR /app
# Husky's git hooks are for developers' machines only.
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci

# ─── build: produce dist/ ───────────────────────────────────────────────────
FROM deps AS build
# Empty: the site calls the API on its own address and the host Nginx forwards /api and /uploads to the backend.
ARG VITE_API_BASE_URL=""
ARG VITE_SWAGGER_URL=http://102.68.87.231:8090/swagger-ui/index.html
ARG VITE_PESAPAL_ENV=live
ARG VITE_GOOGLE_CLIENT_ID="353452894856-d9tudsttmmma590akjuetpap5na22vs9.apps.googleusercontent.com"
ARG VITE_ENABLE_WHATSAPP_VERIFICATION=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SWAGGER_URL=$VITE_SWAGGER_URL \
    VITE_PESAPAL_ENV=$VITE_PESAPAL_ENV \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_ENABLE_WHATSAPP_VERIFICATION=$VITE_ENABLE_WHATSAPP_VERIFICATION
COPY . .
# Node sizes its heap from the machine's RAM, which on a small machine is too little for this build (it needs
# 512–768 MB). Set it outright, with headroom.
ENV NODE_OPTIONS=--max-old-space-size=1536
RUN npm run build

# ─── runtime: just Nginx and the built files ────────────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx/frontend-container.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
