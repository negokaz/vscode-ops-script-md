import * as MarkdownIt from 'markdown-it';

export default interface ExtendedMarkdownIt extends MarkdownIt.MarkdownIt {
    options: MarkdownIt.Options;
}