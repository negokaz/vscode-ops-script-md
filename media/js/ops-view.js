window.addEventListener('load', () => {
    
    const vscode = acquireVsCodeApi();

    function executeScriptChunk(scriptChunkId, scriptChunkElement) {
        const output = scriptChunkElement.querySelector('.output-inner');
        const exitCode = scriptChunkElement.querySelector('.exit-status .code');
        // reset outputs
        output.innerHTML = "";
        exitCode.innerHTML = "";

        scriptChunkElement.classList.remove('ready', 'ran');
        scriptChunkElement.classList.add('running');
        vscode.postMessage({
            command: 'executeScriptChunk',
            scriptChunkId: scriptChunkId,
        });
    }

    function killScriptChunk(scriptChunkId, scriptChunkElement) {
        vscode.postMessage({
            command: 'killScriptChunk',
            scriptChunkId: scriptChunkId,
        });
    }

    function setExitCode(scriptChunkElement, code) {
        scriptChunkElement.querySelector('.exit-status .code').innerText = (typeof code === 'number') ? code : '';
        scriptChunkElement.classList.remove('success', 'failure');
        if (code === 0) {
            scriptChunkElement.classList.add('success');
        } else {
            scriptChunkElement.classList.add('failure');
        }
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

    function updateScriptChunk(scriptChunkId, cb) {
        const scriptChunk =
            document.querySelector(`.script-chunk[data-script-chunk-id="${scriptChunkId}"]`);
        const output = scriptChunk.querySelector('.output-inner');
        const outputOuter = scriptChunk.querySelector('.output');
        const shouldScroll = elementShouldScroll(outputOuter);
        cb(scriptChunk, output);
        if (shouldScroll) {
            scrollToBottom(outputOuter);
        }
    }

    document.querySelectorAll('a.script-chunk-trigger').forEach(trigger => {
        const scriptChunk = trigger.closest('.script-chunk');
        const scriptChunkId = scriptChunk.dataset.scriptChunkId;
        trigger.addEventListener('click', event => {
            if (scriptChunk.classList.contains('ready') || scriptChunk.classList.contains('ran')) {
                executeScriptChunk(scriptChunkId, scriptChunk);
            } else if (scriptChunk.classList.contains('running')) {
                killScriptChunk(scriptChunkId, scriptChunk);
            }
        });
    });
    document.querySelectorAll('a.reload-trigger').forEach(trigger => {
        trigger.addEventListener('click', event => {
            vscode.postMessage({ command: 'reloadDocument' });
        });
    });
    window.addEventListener('message', message => {
        const event = message.data;
        switch (event.event) {
            case 'stdout':
                updateScriptChunk(event.scriptChunkId, (scriptChunk, output) => {
                    output.insertAdjacentText('beforeend', event.data);
                });
                break;
            case 'stderr':
                updateScriptChunk(event.scriptChunkId, (scriptChunk, output) => {
                    output.insertAdjacentText('beforeend', event.data);
                });
                break;
            case 'complete':
                updateScriptChunk(event.scriptChunkId, (scriptChunk, output) => {
                    scriptChunk.classList.remove('running', 'ran');
                    scriptChunk.classList.add('ran');
                    setExitCode(scriptChunk, event.code);
                });
                break;
            case 'error':
                updateScriptChunk(event.scriptChunkId, (scriptChunk, output) => {
                    appendLog(event.scriptChunkId, event.output, event.exitCode);
                    output.insertAdjacentText('beforeend', event.name + '\n' + event.message);
                });
                break;
            case 'log':
                updateScriptChunk(event.scriptChunkId, (scriptChunk, output) => {
                    scriptChunk.classList.remove('ready', 'running', 'ran');
                    scriptChunk.classList.add('ran');
                    output.insertAdjacentText('beforeend', event.output);
                    setExitCode(scriptChunk, event.exitCode);
                });
                break;
            case 'changedDocument':
                document
                    .querySelectorAll('.reload-notification')
                    .forEach(e => e.classList.add('active'));
                break;
        }
    });

    document.querySelectorAll('a.copy-script-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const copyContent = 
                trigger
                    .closest('.script-chunk,.read-only-script-chunk')
                    .querySelector('.script-chunk-code');

            const tmp = document.createElement('textarea');
            tmp.style.position = 'fixed';
            tmp.style.left = '-100%';
            tmp.textContent = copyContent.textContent.trim();
            document.body.appendChild(tmp);
            tmp.select();
            document.execCommand('copy');
            document.body.removeChild(tmp);
        });
    });
});