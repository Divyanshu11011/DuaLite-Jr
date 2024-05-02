import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
    const [outputType, setOutputType] = useState('html');
    const [generatedCode, setGeneratedCode] = useState('');

    // Send a message to the plugin to generate code based on the selected output type
    const sendMessage = () => {
        parent.postMessage({ pluginMessage: { type: 'generate-code', outputType } }, '*');
    };

    // Handle incoming messages from the plugin
    useEffect(() => {
        window.onmessage = (event) => {
            const { type, codeOutput } = event.data.pluginMessage;
            if (type === 'code-generated') {
                setGeneratedCode(codeOutput);
            }
        };
    }, []);

    const handleCopyCode = () => {
        if (!navigator.clipboard) {
            alert('Clipboard functionality is not available.');
            return;
        }

        navigator.clipboard.writeText(generatedCode).then(() => {
            alert('Code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy code! Make sure you have permission to use the clipboard.');
        });
    };

    const handleViewLive = () => {
        let htmlContent;
        if (outputType === 'html') {
            htmlContent = `
                <html>
                    <head>
                        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@^2.0/dist/tailwind.min.css" rel="stylesheet">
                    </head>
                    <body>
                        ${generatedCode}
                    </body>
                </html>`;
        } else if (outputType === 'tailwind') {
            htmlContent = `
                <html>
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
                        <script src="https://cdn.tailwindcss.com"></script>
                    </head>
                    <body>
                        ${generatedCode}
                    </body>
                </html>`;
        }

        const parameters = JSON.stringify({
            files: {
                "index.html": {
                    content: htmlContent
                }
            }
        });

        fetch('https://codesandbox.io/api/v1/sandboxes/define?json=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: parameters
        })
        .then(response => response.json())
        .then(data => {
            if (data && data.sandbox_id) {
                window.open(`https://codesandbox.io/s/${data.sandbox_id}`, '_blank');
            } else {
                alert('Failed to create the sandbox. Please check the generated code for errors.');
            }
        })
        .catch(error => {
            console.error('Error creating the sandbox:', error);
            alert('Error creating the sandbox. Please check your network or console for more details.');
        });
    };

    return (
        <div className="App">
            <h1>Dualite Jr.👶🏻</h1>
            <select value={outputType} onChange={(e) => setOutputType(e.target.value)}>
                <option value="html">HTML</option>
                <option value="tailwind">Tailwind CSS</option>
            </select>
            <button onClick={sendMessage}>Generate Code</button>
            <textarea className="code-output" value={generatedCode} readOnly />
            <button onClick={handleCopyCode}>Copy Code</button>
            <button onClick={handleViewLive}>View Live</button>
        </div>
    );
};

export default App;
