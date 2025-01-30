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
						panel.webview.postMessage({ command: 'chatResponse', text: responseText });
					}
				} catch (error: any) {
					responseText = `Error: ${error.message}`;
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
			body { font-family: sans-serif; margin: 1rem; }
			#prompt { width: 100%; box-sizing: border-box; }
			#response { border: 1px solid #ccc; margin-top: 1rem; padding 0.5rem; }
		</style>
	</head>
	<body>
		<h1>Deep Seek Chat</h1>
		<textarea id="prompt" rows="3" placeholder="Ask Something..."></textarea><br />
		<button id="askBtn">Ask</button>
		<div id="response"></div>

		<script>
			const vscode = acquireVsCodeApi();

			document.getElementById('askBtn').addEventListener('click', () => {
				const prompt = document.getElementById('prompt').value;
				vscode.postMessage({ command: 'chat', prompt });
			});

			window.addEventListener('message', event => {
				const { command, text } = event.data;
				if (command === 'chatResponse') {
					document.getElementById('response').innerText = text;
				}
			});
		</script>
	</body>
	</html>
	`;
}