# Matches the @playwright/test version in package.json (1.63.0) so the
# browsers baked into this image line up with the installed npm package -
# bump both together when upgrading Playwright.
FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

# Separate layer so `npm ci` is only re-run when dependencies actually change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Default container command: api + chromium only. Firefox/webkit add real
# cross-browser signal but roughly double the run time in a container with
# no host GPU/font-cache warmup, so the container's default favors a fast,
# still-meaningful (api + one browser) gate. Override at `docker run` time
# for the full cross-browser suite, or any other subset, e.g.:
#   docker run --rm <image> npm test
#   docker run --rm <image> npm run test:api
CMD ["npm", "run", "test:container"]
