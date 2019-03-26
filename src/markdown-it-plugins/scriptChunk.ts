import { MarkdownIt, Token, Renderer } from 'markdown-it';
import ScriptChunk from '../scriptChunk';
import ScriptChunkManger from '../scriptChunkManager';

export default function markdownItScriptChunk(md: MarkdownIt) {
    const defaultRender = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens: Token[], index: number, options: any, env: any, self: Renderer) => {
        const token = tokens[index];
        const scriptId = token.attrGet(ScriptChunkManger.SCRIPT_ID_ATTR_NAME);
        if (scriptId) {
            const chunk = ScriptChunk.parse(token);
            return `
            <div class="script-chunk" ${ScriptChunkManger.SCRIPT_ID_ATTR_NAME}="${scriptId}">
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
