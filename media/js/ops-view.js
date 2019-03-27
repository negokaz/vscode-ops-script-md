window.addEventListener('load', () => {
    
    const vscode = acquireVsCodeApi();

    function executeScriptChunk(scriptChunkId, scriptChunkElement) {
        const output = scriptChunkElement.querySelector('.output-inner');
        // reset output
        output.innerHTML = "";
        scriptChunkElement.classList.remove('ready', 'ran');
        scriptChunkElement.classList.add('running');
        vscode.postMessage({
            command: 'executeCommand',
            scriptChunkId: scriptChunkId,
        });
    }

    function killScriptChunk(scriptChunkId, scriptChunkElement) {
        vscode.postMessage({
            command: 'killScriptChunk',
            scriptChunkId: scriptChunkId,
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
        const scriptChunkId = scriptChunk.id;
        trigger.addEventListener('click', event => {
            if (scriptChunk.classList.contains('ready') || scriptChunk.classList.contains('ran')) {
                executeScriptChunk(scriptChunkId, scriptChunk);
            } else if (scriptChunk.classList.contains('running')) {
                killScriptChunk(scriptChunkId, scriptChunk);
            }
        });
    });
    window.addEventListener('message', message => {
        const event = message.data;
        const scriptChunkId = event.scriptChunkId;
        const scriptChunk = document.querySelector(`.script-chunk#${scriptChunkId}`);
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