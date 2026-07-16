FROM node:20.9.0-bullseye-slim

# 1) Install Chrome & Xvfb (xvfb-run) + fonts + basic tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    # basic tooling
    wget gnupg ca-certificates procps \
    # Chrome dependencies
    fonts-liberation libappindicator3-1 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 \
    lsb-release xdg-utils \
    # X virtual framebuffer (includes xvfb-run)
    xvfb \
    # wide-coverage fonts so Chrome doesn’t crap out
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
  && rm -rf /var/lib/apt/lists/*

# 2) Add Google’s key & repo, then install Chrome Stable
RUN wget -qO- https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
 && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
       > /etc/apt/sources.list.d/google-chrome.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends google-chrome-stable \
 && rm -rf /var/lib/apt/lists/*

# 3) Tell Puppeteer to use the system Chrome & skip its download
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 4) App setup
WORKDIR /app
COPY package*.json ./

RUN npm install

RUN npm ci \
  && npm install -g nodemon   # install nodemon in one step, running as root

COPY . .

# 5) Expose port
EXPOSE 3000

# 6) Wrap your start in xvfb-run so "headless: false" works without $DISPLAY
CMD ["xvfb-run", "--server-args=-screen 0 1920x1080x24 -ac", \
     "nodemon", "--watch", ".", "src/index.js"]
