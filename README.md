# Dan's Plugins Community Website
This is a website intended to serve as a hub for the Dan's Plugins Community.

The website is currently hosted at [https://dansplugins.com](https://dansplugins.com).

## Contributing
If you would like to contribute to the website, you can do so by forking the repository and submitting a pull request. If you are not familiar with how to do this, you can follow the steps below:
1. Fork the repository
2. Clone the repository to your local machine
3. Make your changes
4. Commit your changes
5. Push your changes to your fork
6. Submit a pull request

## How to compile & run the project
### Compile Manually
To compile the project, you will need to have [Node.js](https://nodejs.org/en/) installed. Once you have Node.js installed, you can run the following commands in the project directory:

```bash
npm install
npm run build
```

### Run Manually
Once the project is compiled, you can run the project by running the following command in the project directory:

```bash
npm run start
```

### `build_and_run.sh` Script
Alternatively, you could execute the `build_and_run.sh` script in the project directory:

```bash
./build_and_run.sh
```

This script will compile the project and then run it.

### Docker
#### Start
The website can be run in a Docker container. To do this, you can run the following commands in the project directory:

```bash
docker build -t dpc-website .
docker run -p 3000:3000 dpc-website
```

#### Stop
To stop the Docker container, you can run the following command in the project directory:

```bash
docker stop dpc-website
```

### Docker Compose
#### Start
The website can also be run in a Docker container using Docker Compose. To do this, you can run the following command in the project directory:

```bash
docker-compose up
```

Alternatively, you could execute the `up.sh` script in the project directory:

```bash
./up.sh
```

#### Stop
To stop the Docker container, you can run the following command in the project directory:

```bash
docker-compose down
```

Alternatively, you could execute the `down.sh` script in the project directory:

```bash
./down.sh
```

## Continuous Deployment

This repository is configured with GitHub Actions for automatic Docker image builds and deployments.

### Docker Image

The Docker image is automatically built and pushed to Docker Hub whenever changes are pushed to the `main` branch or when a new release is published.

**Docker Hub Repository:** `dansplugins/dansplugins-dot-com`

### Available Tags

The following tags are available on Docker Hub:
- `latest` - Latest build from the main branch
- `main` - Latest build from the main branch
- `sha-<sha>` - Specific commit SHA (e.g., `sha-abc1234`)
- Version tags - Semantic versioned releases (e.g., `1.2.3`, `1.2`, `1` without 'v' prefix)

Note: Pull requests trigger builds for validation but images are not pushed to Docker Hub.

### Pulling the Image

To pull and run the latest Docker image:

```bash
docker pull dansplugins/dansplugins-dot-com:latest
docker run -p 3000:3000 dansplugins/dansplugins-dot-com:latest
```

### GitHub Actions Workflow

The workflow is triggered by:
- Pushes to the `main` branch
- Pull requests to the `main` branch (build only, no push)
- Published releases
- Manual workflow dispatch

### Setup Requirements

For the CI/CD pipeline to work, the following secrets must be configured in the GitHub repository:
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password or access token

## Next.js
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

### Why MIT?
We chose the MIT License because it’s **simple, permissive, and widely used**. It allows anyone to use, modify, and distribute the code — even in proprietary projects — as long as the original copyright and license notice are included.  
This helps maximize **adoption**, **collaboration**, and **contribution** by keeping barriers low while still ensuring attribution.
