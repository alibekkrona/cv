FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV DATABASE_URL=mysql://animal_shelter:animal_shelter_password@mysql:3306/animal_shelter
ENV SHADOW_DATABASE_URL=mysql://root:root_password@mysql:3306/prisma_shadow
ENV AUTH_SECRET=build-time-demo-secret
ENV NEXT_PUBLIC_SITE_URL=http://localhost:3100

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["sh", "./docker/app/start-demo.sh"]
