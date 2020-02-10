import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'yaml';
import { promises as fs, constants as fsConstants } from 'fs';
import { default as fastGlob } from 'fast-glob';

const objectAssignDeep = require(`object-assign-deep`);

export default class Config {

    static default(): Config {
        return Config.resolve({});
    }

    static async load(workspaceUri: vscode.Uri): Promise<[Config, vscode.TextDocument[]]> {
        const configPath = path.join(workspaceUri.fsPath, 'opsscript.yml');
        const overwriteConfigPaths = fastGlob(path.join(workspaceUri.fsPath, 'opsscript-*.yml'));
        
        const fetchConfig: Promise<[vscode.TextDocument | null, any]> =
            fs.access(configPath, fsConstants.R_OK).then(() => 
                vscode.workspace.openTextDocument(configPath)
            ).then(document =>
                [document, yaml.parse(document.getText())] as [vscode.TextDocument, any]
            ).catch(_ =>
                [null, {}]
            );
        const fetchOverwriteConfig: Promise<[vscode.TextDocument | null, any]> =
            overwriteConfigPaths.then(paths => {
                if (paths.length > 1) {
                    console.error("config files too many exists");
                    return Promise.resolve(null) as Thenable<vscode.TextDocument>;
                } else if (paths.length === 1) {
                    return vscode.workspace.openTextDocument(paths[0]);
                } else {
                    return Promise.resolve(null) as Thenable<vscode.TextDocument>;
                }
            }).then(document => {
                if (document) {
                    return [document, yaml.parse(document.getText())] as [vscode.TextDocument, any];
                } else {
                    return [null, {}];
                }
            });

        const [configDocument, config] = await fetchConfig;
        const [overwritecConfigDocument, overwriteConfig] = await fetchOverwriteConfig;
        const documents: vscode.TextDocument[] = [];

        if (configDocument) {
            documents.push(configDocument);
        }
        if (overwritecConfigDocument) {
            documents.push(overwritecConfigDocument);
        }

        return [
            Config.resolve(objectAssignDeep(config, overwriteConfig)),
            documents
        ];
    }

    static resolve(config: any): Config {
        return new Config(
            config.environment ? objectAssignDeep(config.environment, process.env) : process.env,
            config.variables ? config.variables : {}
        );
    }

    public readonly env: any;

    public readonly variables: any;

    constructor(env: any, variables: any) {
        this.env = env;
        this.variables = variables;
    }
}