import MarkdownIt from 'markdown-it';
import ExtendedMarkdownIt from './extendedMarkdownIt';
import * as hljs from 'highlight.js';
import markdownContainer from './markdownContainer';
import markdownItScriptChunk from './markdownScriptChunk';
import ScriptChunkManager from '../scriptChunk/scriptChunkManager';
import * as vscode from 'vscode';
import markdownVscResourceLink from './markdownVscResourceLink';
import Config from '../config/config';

export default class MarkdownEngine {

    config: Config;

    md: ExtendedMarkdownIt;

    constructor(config: Config) {
        this.config = config;
        this.md = new MarkdownIt({
            html:         true,        // Enable HTML tags in source
            breaks:       true,        // Convert '\n' in paragraphs into <br>
            linkify:      true,        // Autoconvert URL-like text to links
            highlight: (str, lang) => {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(lang, str).value;
                    } catch (__) {}
                }
                return '';
            }
        }) as ExtendedMarkdownIt;
        this.md.use(markdownContainer);
        this.md.use(markdownItScriptChunk(this.config));
    }

    public render(markdown: string, documentUri: vscode.Uri, config: Config): [string, ScriptChunkManager] {
        this.md.use(markdownVscResourceLink(documentUri));
        const tokens = this.md.parse(markdown, {});
        const manager = new ScriptChunkManager(tokens, config);
        const html = this.md.renderer.render(manager.tokens, this.md.options, {});
        return [html, manager];
    }
}