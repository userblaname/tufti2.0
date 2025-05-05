# Reality Film (Tufti 2.0)

A conversational AI interface inspired by the teachings of Tufti the Priestess and Reality Transurfing by Vadim Zeland.

This project provides a platform for users to interact with an AI embodying the Tufti persona, exploring concepts of reality creation and management through a unique "reality film" metaphor.

## Core Technologies

*   **Frontend:** React, Vite, TypeScript, Tailwind CSS
*   **UI Components:** Shadcn UI (implicitly via ui components), Radix UI (underlying Shadcn)
*   **State Management:** React Context API (`AuthContext`, `MessageContext`)
*   **Animation:** Framer Motion, react-type-animation
*   **Authentication:** Supabase Auth (Google OAuth Provider)
*   **Database:** Supabase (PostgreSQL)
*   **Backend:** Node.js, Express (acting as a proxy)
*   **AI:** Azure OpenAI Service (GPT models)

## Features

*   **Google Authentication:** Secure sign-in/sign-up via Google.
*   **User Onboarding:** Simple profile setup after first login to gather essential context (Name, RT Experience, Focus, Intent).
*   **Persistent Chat History:** Conversations are saved per user in the Supabase database.
*   **Streaming AI Responses:** AI responses are streamed word-by-word for a dynamic experience.
*   **Conversation Deletion:** Users can permanently delete their current conversation history.
*   **Modern UI:** Futuristic, minimal interface with subtle animations and glassmorphism effects.

## Setup for Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/userblaname/tufti2.0.git
    cd tufti2.0
    ```

2.  **Install Dependencies:**
    *   **Frontend:**
        ```bash
        npm install
        ```
    *   **Backend:**
        ```bash
        cd backend
        npm install
        cd .. 
        ```

3.  **Environment Variables:**
    *   **Frontend:** Create a `.env.local` file in the project root:
        ```dotenv
        # .env.local
        VITE_SUPABASE_URL=YOUR_SUPABASE_URL
        VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        ```
    *   **Backend:** Create a `.env` file inside the `backend` directory:
        ```dotenv
        # backend/.env
        AZURE_OPENAI_API_KEY=YOUR_AZURE_API_KEY
        AZURE_OPENAI_ENDPOINT=YOUR_AZURE_ENDPOINT
        OPENAI_API_VERSION="2024-12-01-preview" # Or your desired version
        # Optional:
        # AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name # Defaults to gpt-4.5-preview
        # PORT=3001 # Defaults to 3001
        ```
    *   Replace placeholders with your actual Supabase and Azure credentials.
    *   Ensure `.env.local` and `backend/.env` are listed in your root `.gitignore` file (they should be already).

4.  **Supabase Setup:**
    *   Ensure you have a Supabase project created.
    *   Enable Google Auth provider in Authentication -> Providers.
    *   Create the necessary tables (`users`, `conversations`, `messages`) in the `public` schema with the required columns (refer to `.cursor/rules/data-model.mdc` for details).
    *   Set up Row Level Security (RLS) policies for `users`, `conversations`, and `messages` to allow authenticated users appropriate permissions (INSERT, SELECT, UPDATE, DELETE on their own data). Refer to `.cursor/rules/data-model.mdc` and our conversation history for policy examples.
    *   Ensure the `messages` table has `ON DELETE CASCADE` set for its foreign key relationship to `conversations`.

5.  **Azure OpenAI Setup:**
    *   Ensure you have an Azure OpenAI resource with a model deployed (e.g., `gpt-4.5-preview`).

6.  **Run the Application:**
    *   **Frontend:**
        ```bash
        npm run dev
        ```
    *   **Backend (in a separate terminal):**
        ```bash
        cd backend
        npm start
        ```
    *   Access the frontend via the localhost URL provided by Vite (e.g., `http://localhost:5173/`). 