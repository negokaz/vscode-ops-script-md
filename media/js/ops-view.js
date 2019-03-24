window.addEventListener('load', () => {
    
    const vscode = acquireVsCodeApi();

    document.querySelectorAll('a.command-trigger').forEach(trigger => {
        const scriptId = trigger.dataset.scriptId;
        trigger.addEventListener('click', event => {
            trigger.classList.add('running');
            vscode.postMessage({
                command: 'executeCommand',
                scriptId: scriptId,
            });
        });
    });
    window.addEventListener('message', event => {
        const scriptId = event.data.scriptId;
        const element =
            document.querySelector(`a.command-trigger[data-script-id="${scriptId}"]`);
        element.classList.remove('running');
    });
});