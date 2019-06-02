import { MarkdownIt, Token } from 'markdown-it';

export default function markdownVscResourceLink(md: MarkdownIt) {
    md.use(require('markdown-it-container'), 'info',    { render: renderContainer });
    md.use(require('markdown-it-container'), 'warning', { render: renderContainer });
    md.use(require('markdown-it-container'), 'danger',  { render: renderContainer });
}

function renderContainer(tokens: Token[], idx: number, _options: any, env: any, self: any) {
    // add a class to the opening tag
    if (tokens[idx].nesting === 1) {
        var containerTypeName = tokens[idx].info.trim();
        tokens[idx].attrPush([ 'class', 'alert alert-' + containerTypeName ]);
    }
    return self.renderToken(tokens, idx, _options, env, self);
}