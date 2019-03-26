window.addEventListener('load', () => {
    
    const vscode = acquireVsCodeApi();

    document.querySelectorAll('a.command-trigger').forEach(trigger => {
        const scriptId = trigger.dataset.scriptId;
        const output = trigger.parentElement.querySelector('.output-inner');
        trigger.addEventListener('click', event => {
            // reset output
            if (output.firstChild) {
                output.removeChild(output.firstChild);
            }
            trigger.classList.add('running');
            vscode.postMessage({
                command: 'executeCommand',
                scriptId: scriptId,
            });
        });
    });
    window.addEventListener('message', message => {
        const event = message.data;
        const scriptId = event.scriptId;
        const element =
            document.querySelector(`a.command-trigger[data-script-id="${scriptId}"]`);
        const output =
            element.parentElement.querySelector('.output-inner');
        switch (event.event) {
            case 'stdout':
                output.insertAdjacentText('beforeend', event.data);
                return;
            case 'stderr':
                output.insertAdjacentText('beforeend', event.data);
                return;
            case 'complete':
                element.classList.remove('running', 'ran');
                element.classList.add('ran');
                return;
            case 'error':
                output.insertAdjacentText('beforeend', event.name + '\n' + event.message);
        }
    });
});