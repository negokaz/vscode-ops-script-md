import * as RJSON from 'relaxed-json';
import { MarkdownIt, Token, Renderer } from 'markdown-it';

export default function markdownItScriptChunk(md: MarkdownIt) {
    const defaultRender = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens: Token[], index: number, options: any, env: any, self: Renderer) => {
        const token = tokens[index];
        const maybeSettings = /{.+}/.exec(token.info);
        const settings: any = maybeSettings && maybeSettings.length > 0 ? RJSON.parse(maybeSettings[0]) : { cmd: undefined, args: [] };
        if (settings.cmd) {
            const commandLabel = `${settings.cmd}${settings.args.length > 0 ? ' ' + settings.args.join(' ') : ''}`;
            return `
            <div class="command-box">
                <span class="command-label">${commandLabel}</span>
                <a class="command-trigger" title="run">▶</a>
                ${defaultRender(tokens, index, options, env, self)}
            </div>
            `;
        } else {
            return defaultRender(tokens, index, options, env, self);
        }
    };
}
