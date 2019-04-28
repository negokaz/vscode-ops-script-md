import { MarkdownIt, Token, Renderer } from 'markdown-it';
import ScriptChunk from '../scriptChunk/scriptChunk';
import ScriptChunkManger from '../scriptChunk/scriptChunkManager';

export default function markdownItScriptChunk(md: MarkdownIt) {
    const defaultRender = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens: Token[], index: number, options: any, env: any, self: Renderer) => {
        const token = tokens[index];
        const scriptChunkId = token.attrGet(ScriptChunkManger.SCRIPT_CHUNK_ID_ATTR_NAME);
        if (scriptChunkId) {
            const chunk = ScriptChunk.parse(token);
            return `
            <div class="ready script-chunk" ${ScriptChunkManger.SCRIPT_CHUNK_ID_ATTR_NAME}="${scriptChunkId}">
                <span class="script-chunk-label">${chunk.commandLine}</span>
                <a class="script-chunk-trigger" title="run"></a>
                ${defaultRender(tokens, index, options, env, self)}
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
        } else {
            return defaultRender(tokens, index, options, env, self);
        }
    };
}
