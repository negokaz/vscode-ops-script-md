import MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import * as path from 'path';
import Config from '../config/config';

export default function markdownVscResourceLink(config: Config) {
    return (md: MarkdownIt) => {
        const knownSchemes = ['http:', 'https:', 'file:', 'mailto:', 'data:'];
        const originalNormalizeLink = md.normalizeLink;
        md.normalizeLink = (link: string) => {
            if (knownSchemes.find(value => link.startsWith(value))) {
                return originalNormalizeLink(link);
            } else {
                let resourceUri: vscode.Uri;
                if (path.isAbsolute(link)) {
                    // absolute path
                    resourceUri = vscode.Uri.file(link);
                } else {
                    // relative path
                    resourceUri = vscode.Uri.file(path.join(config.documentDirectory.fsPath, link));
                }
                return originalNormalizeLink(resourceUri.with({ scheme: 'vscode-resource' }).toString(true));
            }
        };
    };
}
