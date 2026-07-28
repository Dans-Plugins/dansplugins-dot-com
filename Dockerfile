FROM node:18

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Bundle app source
COPY components ./components
COPY pages ./pages
COPY public ./public
COPY services ./services
COPY styles ./styles
COPY utils ./utils
COPY next-env.d.ts ./
COPY next.config.js ./
COPY tsconfig.json ./

# Expose port 3000
EXPOSE 3000

# Next.js NEXT_PUBLIC_* vars are inlined at build time
ARG NEXT_PUBLIC_API_URL=http://localhost:45345
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3000
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}

# Build
RUN npm run build

# Start
CMD [ "npm", "run", "start" ]
