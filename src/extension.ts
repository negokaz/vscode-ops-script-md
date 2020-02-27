// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import OpsView from './opsView';
import OpsViewManager from './opsViewManager';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
		console.log('Congratulations, your extension "opsscriptmd" is now active!');

    const opsViewManager = OpsViewManager.create(context);
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(
		vscode.commands.registerCommand('opsScriptMD.openOpsView', opsViewManager.openView(vscode.ViewColumn.Active)),
		vscode.commands.registerCommand('opsScriptMD.openOpsViewToTheSide', opsViewManager.openView(vscode.ViewColumn.Beside)),
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
