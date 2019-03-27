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
            <div id="${scriptChunkId}" class="ready script-chunk">
                <span class="script-chunk-label">${chunk.commandLine}</span>
                <a class="script-chunk-trigger" title="run"></a>
                ${defaultRender(tokens, index, options, env, self)}
                <pre class="output"><code class="output-inner"></code></pre>
            </div>
            `;
        } else {
            return defaultRender(tokens, index, options, env, self);
        }
    };
}
