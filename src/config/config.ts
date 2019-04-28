import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as glob from 'glob';

const objectAssignDeep = require(`object-assign-deep`);

export default class Config {

    static load(workspaceUri: vscode.Uri): Config {
        const configPath = path.join(workspaceUri.fsPath, 'opsscript.yml');
        let config: any = null;
        if (fs.existsSync(configPath)) {
            config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
        }
        const overwriteConfig = glob.sync(path.join(workspaceUri.fsPath, 'opsscript-*.yml'));
        if (overwriteConfig.length > 1) {
            console.warn("config files too many exists");
        } else if (overwriteConfig.length === 1) {
            const overwrite: any = yaml.parse(fs.readFileSync(overwriteConfig[0], 'utf8'));
            config = objectAssignDeep(config, overwrite);
        }
        return Config.resolve(config);
    }

    static resolve(config: any): Config {
        return new Config(config.variables ? config.variables : {});
    }

    public readonly variables: any;

    constructor(variables: any) {
        this.variables = variables;
    }
}