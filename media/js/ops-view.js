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

    function scrollTopMax(element) {
        return element.scrollHeight - element.clientHeight;
    }

    function elementShouldScroll(element) {
        return scrollTopMax(element) - element.scrollTop < 1;
    }

    function scrollToBottom(element) {
        element.scrollTop = scrollTopMax(element);
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
        const outputOuter = scriptChunk.querySelector('.output');
        const shouldScroll = elementShouldScroll(outputOuter);
        switch (event.event) {
            case 'stdout':
                output.insertAdjacentText('beforeend', event.data);
                break;
            case 'stderr':
                output.insertAdjacentText('beforeend', event.data);
                break;
            case 'complete':
                scriptChunk.classList.remove('running', 'ran');
                scriptChunk.classList.add('ran');
                break;
            case 'error':
                output.insertAdjacentText('beforeend', event.name + '\n' + event.message);
                break;
        }
        if (shouldScroll) {
            scrollToBottom(outputOuter);
        }
    });
});