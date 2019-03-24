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
            <div class="command-box">
                <span class="command-label">${chunk.commandLine}</span>
                <a class="command-trigger" title="run" ${ScriptChunkManger.SCRIPT_ID_ATTR_NAME}="${scriptId}" >▶</a>
                ${defaultRender(tokens, index, options, env, self)}
            </div>
            `;
        } else {
            return defaultRender(tokens, index, options, env, self);
        }
    };
}
