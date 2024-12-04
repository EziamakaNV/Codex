# Codex

Codex is a Chrome extension that helps developers understand GitHub repositories using AI. It provides summaries of repositories and explanations of code files, leveraging Chrome's built-in AI capabilities or an external API for more detailed analysis.

## Features

- **Repository Summarization**: Get concise summaries of GitHub repositories, including overviews, main features, technical architecture, and getting started guides.

- **File Explanation**: Understand specific code files on GitHub. Optionally select additional files for context to get more comprehensive explanations.

- **AI Chat Interface**: Engage in a conversation with the AI to ask questions and receive further explanations about the repository or code.

- **Dual AI Options**:
  - **Built-in AI Model**: Uses Chrome's built-in AI capabilities for on-device analysis.
  - **External API (Gemini)**: Sends data to an external API for a more powerful analysis (requires additional setup).

## Installation

### Prerequisites

- **Chrome Version**: Ensure you are using [Chrome Dev Channel](https://www.google.com/chrome/dev/) or [Chrome Canary](https://www.google.com/chrome/canary/), version **128.0.6545.0** or newer.

- **Enable Built-in AI and Prompt API**:

  1. Open Chrome and navigate to `chrome://flags/#optimization-guide-on-device-model`.

     - Set **Enable optimization guide on-device model downloads** to **Enabled BypassPerfRequirement**.

  2. Navigate to `chrome://flags/#prompt-api-for-gemini-nano`.

     - Set **Enable the Prompt API for Gemini Nano** to **Enabled**.

  3. Click **Relaunch** to restart Chrome.

- **Confirm Availability of Gemini Nano**:

  1. Open DevTools (press `Ctrl+Shift+I` or `Cmd+Option+I`).

  2. In the console, run:
     ```javascript
     (await ai.languageModel.capabilities()).available;     ```

  3. If it returns `"readily"`, you are all set.

  4. If it does not, follow these steps:

     - Run `await ai.languageModel.create();` in the console (this may fail, which is expected).

     - Restart Chrome.

     - Go to `chrome://components` and check for updates for **Optimization Guide On Device Model**.

     - Wait for the model to download, then retry checking availability.

### Install Codex Extension

1. **Download the Extension**:

   - Clone or download this repository to your local machine.

2. **Load the Extension in Chrome**:

   - Open Chrome and navigate to `chrome://extensions/`.

   - Enable **Developer mode** by toggling the switch in the upper right corner.

   - Click **Load unpacked** and select the directory containing the extension's files.

3. **Set Up Trial Tokens**:

   - **Important**: Obtain your own trial token for the AI Language Model Origin Trial.

     - Acknowledge [Google’s Generative AI Prohibited Uses Policy](https://policies.google.com/terms/ai).

     - Visit the [Chrome Origin Trials Registration](https://developer.chrome.com/origintrials/#/trials/active) page.

     - Register for the **AI Language Model Origin Trial**.

   - **Add Token to `manifest.json`**:

     - Open `manifest.json` in the extension directory.

     - Replace the placeholder in the `"trial_tokens"` field with your trial token:
       ```json
       "trial_tokens": ["YOUR_TRIAL_TOKEN_HERE"]       ```

     **Note**: Do not share or publish your trial token.

## Usage

1. **Navigate to GitHub**:

   - Open GitHub and go to a repository or file you want to analyze.

2. **Open Codex Extension**:

   - Click on the Codex extension icon in the Chrome toolbar.

3. **Select an Option**:

   - **Get repo summary with Built-in Model**: Provides a summary using Chrome's built-in AI capabilities.

   - **Get detailed repo summary with External model (Gemini)**: Provides a more detailed analysis using an external API (requires additional setup).

   - **Explain Current File**: Provides an explanation of the current code file. You can optionally select additional files for context.

4. **Interact with the AI**:

   - After the initial analysis, a chat interface will appear.

   - Type your questions or requests in the input box and click **Send**.

   - The AI assistant will respond, and you can continue the conversation as needed.

## External API Setup (Optional)

To use the external API option (e.g., Gemini), you may need to set up access to the API and update the extension code with your API endpoint and credentials.

1. **Set Up API Access**:

   - Follow the provider's instructions to obtain access to the API.

2. **Update Extension Code**:

   - Open `sidepanel/panel.js` in the extension directory.

   - Locate the `analyzeWithApi` function.

   - Replace the `API_ENDPOINT` with your API's endpoint URL.
     ```javascript
     const API_ENDPOINT = 'https://your-api-endpoint.com/analyze';     ```

   - Add any necessary headers or authentication as required by the API.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your improvements.

## License

[MIT License](LICENSE)

## Disclaimer

This extension uses experimental features and APIs that are subject to change. Use at your own risk.

## Acknowledgments

- Built using the [Chrome Extensions](https://developer.chrome.com/docs/extensions/) framework with the [Prompt API](https://developer.chrome.com/docs/ai/built-in/) for AI capabilities.

- AI models powered by Chrome's built-in AI and external APIs.

