import MarkdownIt from 'markdown-it';

export default interface ExtendedMarkdownIt extends MarkdownIt {
    options: MarkdownIt.Options;
}
