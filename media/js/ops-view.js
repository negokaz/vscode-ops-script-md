window.addEventListener('load', () => {
    
    const vscode = acquireVsCodeApi();

    document.querySelectorAll('a.script-chunk-trigger').forEach(trigger => {
        const scriptChunk = trigger.closest('.script-chunk');
        const scriptId = scriptChunk.dataset.scriptId;
        const output = scriptChunk.querySelector('.output-inner');
        trigger.addEventListener('click', event => {
            // reset output
            if (output.firstChild) {
                output.removeChild(output.firstChild);
            }
            scriptChunk.classList.add('running');
            vscode.postMessage({
                command: 'executeCommand',
                scriptId: scriptId,
            });
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