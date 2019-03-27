window.addEventListener('load', () => {
    
    const vscode = acquireVsCodeApi();

    function executeScriptChunk(scriptId, scriptChunkElement) {
        const output = scriptChunkElement.querySelector('.output-inner');
        // reset output
        output.childNodes.forEach(e => output.removeChild(e))
        scriptChunkElement.classList.remove('ready', 'ran');
        scriptChunkElement.classList.add('running');
        vscode.postMessage({
            command: 'executeCommand',
            scriptId: scriptId,
        });
    }

    function killScriptChunk(scriptId, scriptChunkElement) {
        vscode.postMessage({
            command: 'killScriptChunk',
            scriptId: scriptId,
        });
    }

    document.querySelectorAll('a.script-chunk-trigger').forEach(trigger => {
        const scriptChunk = trigger.closest('.script-chunk');
        const scriptId = scriptChunk.dataset.scriptId;
        trigger.addEventListener('click', event => {
            if (scriptChunk.classList.contains('ready') || scriptChunk.classList.contains('ran')) {
                executeScriptChunk(scriptId, scriptChunk);
            } else if (scriptChunk.classList.contains('running')) {
                killScriptChunk(scriptId, scriptChunk);
            }
        });
    });
    window.addEventListener('message', message => {
        const event = message.data;
        const scriptId = event.scriptId;
        const scriptChunk =
            document.querySelector(`.script-chunk[data-script-id="${scriptId}"]`);
        const output = scriptChunk.querySelector('.output-inner');
        switch (event.event) {
            case 'stdout':
                output.insertAdjacentText('beforeend', event.data);
                return;
            case 'stderr':
                output.insertAdjacentText('beforeend', event.data);
                return;
            case 'complete':
                scriptChunk.classList.remove('running', 'ran');
                scriptChunk.classList.add('ran');
                return;
            case 'error':
                output.insertAdjacentText('beforeend', event.name + '\n' + event.message);
        }
    });
});