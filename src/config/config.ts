import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'yaml';
import { promises as fs, constants as fsConstants } from 'fs';
import { default as fastGlob } from 'fast-glob';

const barbe = require('barbe');
const objectAssignDeep = require(`object-assign-deep`);

export default class Config {

    static async load(documentUri: vscode.Uri): Promise<Config> {
        const documentDirectoryPath = path.dirname(documentUri.fsPath);
        const configPath = await Config.findConfigFile(path.dirname(documentUri.fsPath));
        if (configPath) {
            const baseDirectoryPath = path.dirname(configPath.fsPath);
            const fetchConfig: Thenable<[vscode.TextDocument, any]> =
                vscode.workspace.openTextDocument(configPath)
                    .then(document => [document, yaml.parse(document.getText())]);
            const fetchOverwriteConfig: Thenable<[vscode.TextDocument | null, any]> = 
                fastGlob(['opsscript-*.yml'], { cwd: baseDirectoryPath })
                    .then(paths => {
                        if (paths.length > 1) {
                            console.error("config files too many exists");
                            return Promise.resolve(null) as Thenable<vscode.TextDocument>;
                        } else if (paths.length === 1) {
                            return vscode.workspace.openTextDocument(path.join(baseDirectoryPath, paths[0]));
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
            const configVariables: Object = {
                BASE_PATH: baseDirectoryPath
            };
            const loadedConfig = Config.assignVariables(objectAssignDeep(config, overwriteConfig), configVariables);
            return Config.resolve(baseDirectoryPath, documentDirectoryPath, loadedConfig, documents);
        }
        return Config.resolve(documentDirectoryPath, documentDirectoryPath, {}, []);
    }

    private static assignVariables(config: any, variables: Object): any {
        if (!(typeof config === "object" || config instanceof Array)) {
            throw new Error(`config must be object or array: ${config}`);
        }

        function assign(element: string): string {
            return barbe(element, ["${", "}"], variables);
        }
        for (let key in config) {
            const element = config[key];
            if (typeof element === "string") {
                config[key] = assign(element);
            } else if (typeof element === "object" || element instanceof Array) {
                this.assignVariables(element, variables);
            }
        }
        return config;
    }

    private static findConfigFile(baseDirectoryPath: string): Promise<vscode.Uri | null> {
        const parentDirPath = path.dirname(baseDirectoryPath);
        if (baseDirectoryPath === parentDirPath) {
            // arrived at root directory
            return Promise.resolve(null);
        }
        const configPath = path.join(baseDirectoryPath, 'opsscript.yml');
        return fs.access(configPath, fsConstants.R_OK)
            .then(_ => vscode.Uri.file(configPath))
            .catch(_ => this.findConfigFile(parentDirPath));
    }

    static resolve(baseDirectoryPath: string, documentDirectoryPath: string, config: any, configDocuments: vscode.TextDocument[]): Config {
        const baseVariables: Object = {
            BASE_PATH: baseDirectoryPath
        };
        const env = objectAssignDeep({}, process.env);
        return new Config(
            vscode.Uri.file(baseDirectoryPath),
            vscode.Uri.file(documentDirectoryPath),
            configDocuments,
            config.environment ? objectAssignDeep(env, config.environment) : env,
            config.variables ? objectAssignDeep(baseVariables, config.variables) : baseVariables
        );
    }

    public readonly baseDirectory: vscode.Uri;

    public readonly documentDirectory: vscode.Uri;

    public readonly configDocuments: vscode.TextDocument[];

    public readonly env: any;

    public readonly variables: any;

    constructor(baseDirectory: vscode.Uri, documentDirectory: vscode.Uri, configDocuments: vscode.TextDocument[], env: any, variables: any) {
        this.baseDirectory = baseDirectory;
        this.documentDirectory = documentDirectory;
        this.configDocuments = configDocuments;
        this.env = env;
        this.variables = variables;
    }
}
