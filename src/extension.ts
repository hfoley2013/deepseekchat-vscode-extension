// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as ollama from 'ollama';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('DeepChat is active.');

	const disposable = vscode.commands.registerCommand('deepchat.chat', () => {
		const panel = vscode.window.createWebviewPanel(
			'deepchat',
			'DeepSeek Chat',
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);
		panel.webview.html = getWebviewContent();

		panel.webview.onDidReceiveMessage(async (message: any) => {
			if (message.command === 'chat') {
				const userPrompt = message.prompt;
				let responseText = '';

				try {
					const streamResponse = await ollama.default.chat({
						model: 'deepseek-r1:latest',
						messages: [{ role: 'user', content: userPrompt }],
						stream: true
					});

					for await (const part of streamResponse) {
						responseText += part.message.content;
						panel.webview.postMessage({ command: 'chatResponse', text: responseText, isFinal: false });
					}

					// Final message to indicate streaming is complete
					panel.webview.postMessage({ command: 'chatResponse', text: responseText, isFinal: true });

				} catch (error: any) {
					panel.webview.postMessage({ command: 'chatResponse', text: `Error: ${error.message}`, isFinal: true });
				}
			}
		});
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }

function getWebviewContent(): string {
	return /*html*/`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeepSeek Chat</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Arial, sans-serif;
            background-color: #f3f4f6;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            padding: 1rem;
        }

        .chat-container {
            width: 100%;
            max-width: 600px;
            background-color: #ffffff;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            height: 80vh;
        }

        .chat-header {
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }

        .chat-box {
            flex-grow: 1;
            overflow-y: auto;
            padding: 10px;
			color: #000000;
        }

        .chat-message {
			background-color: #e5e7eb;
			padding: 12px;
			border-radius: 6px;
			margin-bottom: 10px;
			max-width: 80%;
			word-wrap: break-word;
			position: relative; /* Needed for absolute positioning of copy button */
		}

		.chat-message.user {
			background-color: #2563eb;
			color: white;
			align-self: flex-end;
		}

        .input-container {
            display: flex;
            border-top: 1px solid #ddd;
            padding: 10px;
            gap: 8px;
        }

        textarea {
            flex-grow: 1;
            padding: 8px;
            font-size: 14px;
            border: 1px solid #ccc;
            border-radius: 6px;
            resize: none;
        }

        button {
            background-color: #4f46e5;
            color: white;
            border: none;
            padding: 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }

        button:hover {
            background-color: #4338ca;
        }
		.copy-btn {
			position: absolute;
			bottom: 4px;
			right: 4px;
			background: none;
			border: none;
			cursor: pointer;
			font-size: 14px;
			color: #666;
			padding: 4px;
			opacity: 0; /* Initially hidden */
			transition: opacity 0.2s ease-in-out;
		}
		.chat-message:hover .copy-btn {
			opacity: 1; /* Show only on hover */
		}

		.copy-btn:hover {
			color: #000;
		}
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">DeepSeek Chat</div>
        <div id="response" class="chat-box"></div>
        <div class="input-container">
            <textarea id="prompt" rows="2" placeholder="Ask something..."></textarea>
            <button id="askBtn">Ask</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

		document.getElementById('askBtn').addEventListener('click', () => {
			const prompt = document.getElementById('prompt').value;
			if (prompt.trim() === "") return;
			const chatBox = document.getElementById('response');

			// Add user's message
			const userMessage = document.createElement('div');
			userMessage.classList.add('chat-message', 'user');
			userMessage.innerText = prompt;
			chatBox.appendChild(userMessage);

			// Create a single AI response container before sending the request
			const aiMessage = document.createElement('div');
			aiMessage.classList.add('chat-message');
			chatBox.appendChild(aiMessage);

			// Scroll to bottom
			chatBox.scrollTop = chatBox.scrollHeight;

			vscode.postMessage({ command: 'chat', prompt });
			document.getElementById('prompt').value = '';

			// Store the latest AI message div for updating
			window.latestAIMessage = aiMessage;
		});

		window.addEventListener('message', event => {
			const { command, text, isFinal } = event.data;
			if (command === 'chatResponse') {
				if (window.latestAIMessage) {
					window.latestAIMessage.innerText = text;

					// Only add the copy button once streaming is complete
					if (isFinal && !window.latestAIMessage.querySelector('.copy-btn')) {
						const copyButton = document.createElement('button');
						copyButton.innerHTML = '⧉'; // Double squares symbol
						copyButton.classList.add('copy-btn');

						copyButton.addEventListener('click', () => {
							navigator.clipboard.writeText(text).then(() => {
								copyButton.innerText = '✔'; // Show checkmark on success
								setTimeout(() => { copyButton.innerHTML = '⧉'; }, 1500);
							});
						});

						window.latestAIMessage.appendChild(copyButton);
					}
				}
			}
		});
    </script>
</body>
</html>
	`;
}