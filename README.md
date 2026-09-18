# LocalLens

## Private Text Intelligence powered by QVAC

LocalLens is a lightweight on-device AI application that transforms unstructured text into useful structured information.

Paste meeting notes, emails, project requirements, instructions, or other text and LocalLens produces:

- A concise summary
- Key points
- Action items
- Overall sentiment

All AI inference runs locally through Tether's QVAC SDK using the Qwen3 0.6B Q4 model.

## Features

- On-device AI inference
- Summary generation
- Key point extraction
- Action item extraction
- Sentiment classification
- No cloud AI API required
- Lightweight Node.js backend
- Simple browser interface

## Technology

- Node.js
- JavaScript
- HTML/CSS
- QVAC SDK @qvac/sdk 0.19.1
- Qwen3 0.6B Q4

## Requirements

- Windows 10 or newer
- Node.js 22.17 or newer
- npm 10.9 or newer
- Vulkan 1.4 or newer
- At least 4 GB RAM recommended

## Installation

Clone the repository:

    git clone https://github.com/YOUR-USERNAME/qvac-local-lens.git
    cd qvac-local-lens

Install dependencies:

    npm install

## Run

Start LocalLens:

    QVAC_CONFIG_PATH=./qvac.config.json npm start

Then open:

    http://localhost:3000

On first use, QVAC loads the Qwen3 0.6B Q4 model locally. The model is cached on the device for subsequent use.

## Example

Input:

    The project meeting has moved to Thursday at 2 PM. Everyone should bring
    their latest progress report and report any blockers before the meeting.

LocalLens can turn this into:

- Summary: The project meeting has moved to Thursday at 2 PM.
- Key points: New meeting time and required progress reports.
- Action items: Bring the latest report and report blockers.
- Sentiment: Neutral

## How It Works

1. The user enters text in the LocalLens interface.
2. The browser sends the text to the local Node.js server.
3. The server loads the Qwen3 model through QVAC.
4. QVAC performs inference locally.
5. The model returns structured JSON.
6. LocalLens renders the results in the browser.

The project uses QVAC's loadModel(), completion(), and unloadModel() APIs.

## Privacy

LocalLens is designed for local inference.

The application does not use OpenAI, Gemini, Claude, OpenRouter, or another cloud AI API to generate its results.

AI inference is performed locally through QVAC.

## License

MIT License.
