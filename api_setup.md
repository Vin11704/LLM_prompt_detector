# LLM Security Evaluation Harness

## Project Details
This project is an automated evaluation harness designed to test Large Language Models (LLMs) against a batch of prompts. The system acts as a pipeline that classifies incoming prompts, sends them to a target model, and evaluates the resulting output to see if the target model complied, refused, or partially leaked information to potentially malicious requests. It features a FastAPI backend and a web-based frontend interface.

## Models Used
The system divides its tasks across three different LLM roles via the Google GenAI SDK:
*   **Classifier Model**: Analyzes the prompt to classify it as BENIGN or MALICIOUS. (Default: `gemini-2.5-flash`)
*   **Sentinel Model**: Acts as a judge to evaluate the target model's response (COMPLIED, REFUSED, PARTIAL). (Default: `gemini-2.5-flash`)
*   **Target Model**: The actual model being evaluated and subjected to the prompt. (Default: `gemini-2.5-flash`)

*Note: For users with paid-tier Google AI Studio credits, the Classifier and Sentinel models can be switched to `gemini-3.1-pro-preview` inside [backend/llm.py](backend/llm.py). Original report used `gemini-3.1-pro-preview`.*

Originally, the system was designed to work with Vertex AI, and the codebase still supports it. However, for ease of access and to allow users without Google Cloud accounts to test the system, the default configuration uses Google AI Studio's free tier models. You may switch to Vertex AI by following the API key setup instructions below. The model with vertex AI enabled uses gemini-3.1-pro-preview for the classifier and sentinel roles, which should provide more accurate classifications and evaluations.

## API Key Setup & Configuration
You need a `.env` file in the root directory of the project. The app supports both Google AI Studio and Google Vertex AI.

### Option 1: Using Google AI Studio (Free/Developer Tier)

**How to get a Google AI Studio API Key:**
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click on **Get API key** in the left sidebar.
4. Click **Create API key** and copy the generated key.

Create a `.env` file in the root directory:
```properties
GEMINI_API_KEY=your_google_ai_studio_api_key
```

### Option 2: Using Vertex AI (Google Cloud)

**How to get Vertex AI Credentials:**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Google Cloud Project or select an existing one.
3. Ensure billing is enabled for your project.
4. Go to **APIs & Services > Library**, search for **Vertex AI API**, and click **Enable**.
5. Go to **IAM & Admin > Service Accounts** and click **Create Service Account**.
6. Grant the service account the **Vertex AI User** role.
7. Click on the created service account, go to the **Keys** tab, click **Add Key > Create new key**, and select **JSON**.
8. A JSON file will be downloaded to your computer. (e.g., `google-credentials.json`). Place this file in your project directory (make sure it's ignored by Git).

Create a `.env` file in the root directory:
```properties
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-credentials.json
```
*Note: If you use Vertex AI alongside Docker, you must uncomment the `volumes` section in [docker-compose.yml](docker-compose.yml) to mount your local service account JSON key to the container. If running locally, `GOOGLE_APPLICATION_CREDENTIALS` should be the absolute path to your JSON key file.*