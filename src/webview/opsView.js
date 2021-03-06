import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/shift-away-subtle.css';

import * as AnsiToHtml from 'ansi-to-html';

function AnsiConverterManager() {

    const converters = {};

    const style = getComputedStyle(document.documentElement);

    return {

        getConverter: function (scriptChunkId) {
            const converter = converters[scriptChunkId];
            if (converter) {
                return converter;
            } else {
                const newConverter = this.createConverter();
                converters[scriptChunkId] = newConverter;
                return newConverter;
            }
        },

        createConverter: function() {
            return new AnsiToHtml({
                fg: style.getPropertyValue('--vscode-terminal-foreground'),
                bg: style.getPropertyValue('--vscode-terminal-background'),
                escapeXML: true,
                stream: true,
                colors: {
                    0: style.getPropertyValue('--vscode-terminal-ansiBlack'),
                    1: style.getPropertyValue('--vscode-terminal-ansiRed'),
                    2: style.getPropertyValue('--vscode-terminal-ansiGreen'),
                    3: style.getPropertyValue('--vscode-terminal-ansiYellow'),
                    4: style.getPropertyValue('--vscode-terminal-ansiBlue'),
                    5: style.getPropertyValue('--vscode-terminal-ansiMagenta'),
                    6: style.getPropertyValue('--vscode-terminal-ansiCyan'),
                    7: style.getPropertyValue('--vscode-terminal-ansiWhite'),
                    8: style.getPropertyValue('--vscode-terminal-ansiBrightBlack'),
                    9: style.getPropertyValue('--vscode-terminal-ansiBrightRed'),
                    10: style.getPropertyValue('--vscode-terminal-ansiBrightGreen'),
                    11: style.getPropertyValue('--vscode-terminal-ansiBrightYellow'),
                    12: style.getPropertyValue('--vscode-terminal-ansiBrightBlue'),
                    13: style.getPropertyValue('--vscode-terminal-ansiBrightMagenta'),
                    14: style.getPropertyValue('--vscode-terminal-ansiBrightCyan'),
                    15: style.getPropertyValue('--vscode-terminal-ansiBrightWhite')
                }
            });
        }
    };
}

window.addEventListener('load', () => {
    
    const vscode = acquireVsCodeApi();
    const ansiConverterManager = new AnsiConverterManager();

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
                    const ansiConverter = ansiConverterManager.getConverter(event.scriptChunkId);
                    output.insertAdjacentHTML('beforeend', ansiConverter.toHtml(event.data));
                });
                break;
            case 'stderr':
                updateScriptChunk(event.scriptChunkId, (scriptChunk, output) => {
                    const ansiConverter = ansiConverterManager.getConverter(event.scriptChunkId);
                    output.insertAdjacentHTML('beforeend', ansiConverter.toHtml(event.data));
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
                    output.insertAdjacentText('beforeend', event.name + '\n' + event.message);
                });
                break;
            case 'log':
                updateScriptChunk(event.scriptChunkId, (scriptChunk, output) => {
                    const ansiConverter = ansiConverterManager.getConverter(event.scriptChunkId);
                    scriptChunk.classList.remove('ready', 'running', 'ran');
                    scriptChunk.classList.add('ran');
                    output.insertAdjacentHTML('beforeend', ansiConverter.toHtml(event.output));
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
        // tippy.js settings
        // see: https://atomiks.github.io/tippyjs/all-props/
        const tippyInstance = tippy(trigger, {
            trigger: 'manual',
            content: '&#xec4b;',
            animation: 'shift-away-subtle',
            duration: [250, 250],
            theme: 'opsview',
            onShown: (instance) => {
                setTimeout(() => instance.hide(), 500);
            }
        });

        trigger.addEventListener('click', (event) => {
            const copyContent = 
                trigger
                    .closest('.script-chunk,.read-only-script-chunk')
                    .querySelector('.script-chunk-code');
            // copy
            const tmp = document.createElement('textarea');
            tmp.style.position = 'fixed';
            tmp.style.left = '-100%';
            tmp.textContent = copyContent.textContent.trim();
            document.body.appendChild(tmp);
            tmp.select();
            document.execCommand('copy');
            document.body.removeChild(tmp);
            // show tooltip
            tippyInstance.show();
        });
    });

    const passThroughLinkSchemes = ['http:', 'https:', 'mailto:', 'vscode:', 'vscode-insiders:'];

    Array.from(document.querySelectorAll('a'))
        .filter(node => node.href && !passThroughLinkSchemes.some(scheme => node.href.startsWith(scheme)))
        .forEach(node => {
            node.addEventListener('click', event => {
                vscode.postMessage({ command: 'openLink', href: node.href });
                event.preventDefault();
                event.stopPropagation();
                return;
            });
        });
});
