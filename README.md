# CyberAcademyLMS

A comprehensive Learning Management System built for cybersecurity training.

## Features

*   **Interactive Courses**: Learn cybersecurity concepts through engaging modules.
*   **Virtual Labs**: Practice your skills in safe, isolated virtual environments.
*   **AI Assistant**: Get help and guidance from an integrated AI tutor.
*   **Progress Tracking**: Monitor your learning journey and achievements.
*   **Secure Authentication**: Robust user access control.
*   **Payment Integration**: Seamless payment processing for premium courses.

## Tech Stack

*   **Frontend**: React (Vite), TypeScript, Tailwind CSS
*   **Backend**: Node.js, Express, TypeScript
*   **Database**: PostgreSQL
*   **ORM**: Prisma
*   **Virtual Labs**: Integration with safe environments for practical exercises.
*   **AI Integration**: Powered by Groq/xAI (depending on configuration).

## Project Structure

*   `client/`: Contains the React frontend application.
*   `server/`: Contains the Node.js backend API.

## Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn
*   PostgreSQL database

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Mesharktech/CyberAcademyLMS.git
    cd CyberAcademyLMS
    ```

2.  **Install dependencies and setup environments:**

    *   **Backend:**
        ```bash
        cd server
        npm install
        # Copy .env.example to .env and configure your variables (Database URL, API Keys, etc.)
        npx prisma generate
        npm run build
        ```

    *   **Frontend:**
        ```bash
        cd ../client
        npm install
        # Configure any necessary environment variables for the frontend
        ```

### Running Locally

1.  **Start the Backend:**
    ```bash
    cd server
    npm run dev  # For development with nodemon
    # OR
    npm start    # To run the compiled build
    ```

2.  **Start the Frontend:**
    ```bash
    cd client
    npm run dev
    ```

3.  The backend API will typically run on `http://localhost:5000`.
4.  The frontend application will be accessible at the URL provided by Vite (e.g., `http://localhost:5173`).


## License

ISC License
