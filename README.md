<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/16pUDvmJxUf7xjwLEPP0aDlL-iPYD9byS

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your API keys:
   - Copy `.env.example` to `.env`
   - Add your Gemini API key from [Google AI Studio](https://ai.google.dev/)
   - Optionally add other API keys for additional AI providers

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3001`

## Configuration

- **Missing API Key Error**: If you see "Gemini API key is required", go to the ⚙️ Settings view in the app to configure your API keys
- **Local LLM**: The app can also connect to local language models running on port 1234 (like LM Studio)
- **WebSocket Issues**: Make sure the dev server is running on port 3001
