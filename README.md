
# Running a Node.js Web Application with Docker Compose

This guide provides detailed instructions on how to run a Node.js web application using Docker Compose, assuming that the necessary Dockerfile and `docker-compose.yml` files are already present in the repository.

## Prerequisites

Before you begin, make sure you have the following installed on your system:
- Docker
- Docker Compose

See the [Docker Engine Installation Guide](#docker-engine-installation-guide) section for details on how to install the Docker and Docker Compose.

## Steps to Run the Application

1. **Clone the Repository**

   First, clone the repository to your local machine using the following command:

   ```bash
   git clone https://github.com/meineron/school-sport-web.git
   cd school-sport-web
   ```

2. **Build the Docker Containers**

   Navigate to the directory containing the `docker-compose.yml` file and run the following command to build the Docker containers. This command also pulls the necessary images:

   ```bash
   docker-compose build
   ```

3. **Run the Docker Containers**

   Once the build process is complete, you can start the application by running:

   ```bash
   docker-compose up
   ```

   If you want to run the containers in the background, you can add the `-d` flag:

   ```bash
   docker-compose up -d
   ```

4. **Access the Web Application**

   After the containers are up and running, you can access the web application by navigating to `http://localhost:5000` in your web browser, where `5000` is the port exposed by your Node.js application in the Docker container.

5. **Stop the Application**

   When you are done, you can stop the Docker containers by running:

   ```bash
   docker-compose down
   ```

## Additional Commands

- To view the logs of the containers, use:
  
  ```bash
  docker-compose logs
  ```

- To rebuild the application after making changes, use:

  ```bash
  docker-compose up --build
  ```


# Docker Engine Installation Guide

This guide provides instructions on how to install Docker Engine on various operating systems, including Linux, macOS, and Windows. Docker is a platform for developing, shipping, and running applications inside containers.

## Prerequisites

Ensure your system meets the hardware and software requirements:

- A compatible 64-bit operating system (e.g., Ubuntu 20.04, Windows 10/11, macOS Catalina or newer)
- Virtualization support enabled in BIOS

## Installing on Linux

The installation steps for Docker on Linux can vary depending on the distribution. Below are the general steps for Ubuntu:

1. Update your package index:
    ```bash
    sudo apt-get update
    ```
2. Install packages to allow apt to use a repository over HTTPS:
    ```bash
    sudo apt-get install \
        apt-transport-https \
        ca-certificates \
        curl \
        software-properties-common
    ```
3. Add Docker’s official GPG key:
    ```bash
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    ```
4. Set up the stable repository:
    ```bash
    sudo add-apt-repository \
        "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) \
        stable"
    ```
5. Install Docker Engine:
    ```bash
    sudo apt-get update && sudo apt-get install docker-ce
    ```
6. Verify that Docker is installed correctly by running the hello-world image:
    ```bash
    sudo docker run hello-world
    ```
Refer to the official [Docker documentation](https://docs.docker.com/desktop/install/linux-install/) for other Linux distributions.

## MacOS

To install Docker on MacOS, download Docker Desktop from the Docker Hub:

1. Go to [Docker Hub](https://hub.docker.com/editions/community/docker-ce-desktop-mac/) and download the Docker Desktop application.

2. Double-click the downloaded `.dmg` file and drag the Docker icon to your Application folder.

3. Run Docker from your Applications folder, and follow the on-screen instructions to complete the installation.
Refer to the official [Docker documentation](https://docs.docker.com/desktop/install/mac-install/) for more details.

## Windows

To install Docker on Windows, download Docker Desktop for Windows:

1. Go to [Docker Hub](https://hub.docker.com/editions/community/docker-ce-desktop-windows/) and download the Docker Desktop installer.

2. Run the installer and follow the on-screen instructions to complete the installation.

3. Docker will require you to enable the WSL 2 feature and install a Linux kernel update package if you are on Windows 10.

4. After installation, launch Docker, and it will guide you through the configuration process.
Refer to the official [Docker documentation](https://docs.docker.com/desktop/install/windows-install/) for other Windows distributions.

