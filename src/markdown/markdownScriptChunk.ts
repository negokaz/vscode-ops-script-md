import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import Renderer from 'markdown-it/lib/renderer';
import ScriptChunkManger from '../scriptChunk/scriptChunkManager';
import MarkdownRenderEnv from './markdownRenderEnv';

export default function markdownItScriptChunk() {
    return (md: MarkdownIt) => {
        const defaultRender = md.renderer.rules.fence;
        md.renderer.rules.fence = (tokens: Token[], index: number, options: any, env: MarkdownRenderEnv, self: Renderer) => {
            const token = tokens[index];
            const scriptChunkId = token.attrGet(ScriptChunkManger.SCRIPT_CHUNK_ID_ATTR_NAME);
            if (scriptChunkId) {
                const chunk = env.scriptChunkManager.getScriptChunk(scriptChunkId);
                if (chunk.error) {
                    return `
                    <div class="ready script-chunk" ${ScriptChunkManger.SCRIPT_CHUNK_ID_ATTR_NAME}="${scriptChunkId}">
                        <span class="script-chunk-label error">[${chunk.error.name}] ${chunk.error.message}</span>
                        <div class="script-chunk-control-panel">
                            <a class="copy-script-trigger" title="copy to clipboard"></a>
                        </div>
                        <div class="script-chunk-code">
                            ${defaultRender(tokens, index, options, env, self)}
                        </div>
                    </div>
                    `;
                } else {
                    return `
                    <div class="ready script-chunk" ${ScriptChunkManger.SCRIPT_CHUNK_ID_ATTR_NAME}="${scriptChunkId}">
                        <span class="script-chunk-label">${chunk.commandLine}</span>
                        <div class="script-chunk-control-panel">
                            <a class="script-chunk-trigger" title="run"></a>
                            <a class="copy-script-trigger" title="copy to clipboard"></a>
                        </div>
                        <div class="script-chunk-code">
                            ${defaultRender(tokens, index, options, env, self)}
                        </div>
                        <pre class="output"><code class="output-inner"></code></pre>
                        <div class="exit-status">
                            <div class="spinner">
                                <div class="bounce1"></div>
                                <div class="bounce2"></div>
                                <div class="bounce3"></div>
                            </div>
                            <span class="code"></span>
                        </div>
                    </div>
                    `;
                }
            } else {
                return `
                    <div class="read-only-script-chunk">
                        <div class="script-chunk-control-panel">
                            <a class="copy-script-trigger" title="copy to clipboard"></a>
                        </div>
                        <div class="script-chunk-code">
                            ${defaultRender(tokens, index, options, env, self)}
                        </div>
                    </div>
                `;
            }
        };
    };
}
