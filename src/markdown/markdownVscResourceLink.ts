import { MarkdownIt } from 'markdown-it';
import * as vscode from 'vscode';
import * as path from 'path';

export default function markdownVscResourceLink(documentUri: vscode.Uri) {
    return (md: MarkdownIt) => {
        const knownSchemes = ['http:', 'https:', 'file:', 'mailto:', 'data:'];
        const originalNormalizeLink = md.normalizeLink;
        md.normalizeLink = (link: string) => {
            if (knownSchemes.find(value => link.startsWith(value))) {
                return originalNormalizeLink(link);
            } else {
                let resourceUri = vscode.Uri.file(link);
                if (link.startsWith('/')) {
                    // absolute path from workspace
                    const workspace = vscode.workspace.getWorkspaceFolder(documentUri);
                    const rootPath = workspace ? workspace.uri.path : path.dirname(documentUri.path);
                    resourceUri = vscode.Uri.file(path.join(rootPath, link));
                } else {
                    // relative path
                    const rootPath = path.dirname(documentUri.path);
                    resourceUri = vscode.Uri.file(path.join(rootPath, link));
                }
                return originalNormalizeLink(resourceUri.with({ scheme: 'vscode-resource' }).toString(true));
            }
        };
    };
}