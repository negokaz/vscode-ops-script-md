window.addEventListener('load', () => {
    
    const vscode = acquireVsCodeApi();

    document.querySelectorAll('a.command-trigger').forEach(trigger => {
        const scriptId = trigger.dataset.scriptId;
        const output = trigger.parentElement.querySelector('.output');
        trigger.addEventListener('click', event => {
            // reset output
            output.innerHTML = '';
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
            element.parentElement.querySelector('.output');
        switch (event.event) {
            case 'stdout':
                output.innerText = output.innerText + event.data;
                return;
            case 'stderr':
                output.innerText = output.innerText + event.data;
                return;
            case 'complete':
                element.classList.remove('running');
                return;
            case 'error':
                output.innerText = output.innerText + event.name + '\n' + event.message;
        }
    });
});