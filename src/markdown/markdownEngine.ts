import * as MarkdownIt from 'markdown-it';
import ExtendedMarkdownIt from './extendedMarkdownIt';
import * as hljs from 'highlight.js';
import markdownItScriptChunk from './markdownScriptChunk';
import ScriptChunkManager from '../scriptChunk/scriptChunkManager';
import * as vscode from 'vscode';
import markdownVscResourceLink from './markdownVscResourceLink';

export default class MarkdownEngine {

    md: ExtendedMarkdownIt;

    constructor() {
        this.md = new MarkdownIt({
            highlight: (str, lang) => {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(lang, str).value;
                    } catch (__) {}
                }
                return '';
            }
        }) as ExtendedMarkdownIt;
        this.md.use(markdownItScriptChunk);
    }

    public render(markdown: string, documentUri: vscode.Uri): [string, ScriptChunkManager] {
        this.md.use(markdownVscResourceLink(documentUri));
        const tokens = this.md.parse(markdown, {});
        const manager = new ScriptChunkManager(tokens);
        const html = this.md.renderer.render(manager.tokens, this.md.options, {});
        return [html, manager];
    }
}