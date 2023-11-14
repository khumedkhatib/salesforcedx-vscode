/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  Command,
  SfdxCommandBuilder
} from '@salesforce/salesforcedx-utils-vscode';
import {
  CancelResponse,
  ContinueResponse,
  ParametersGatherer
} from '@salesforce/salesforcedx-utils-vscode';
import * as vscode from 'vscode';
import { nls } from '../messages';
import {
  SfdxCommandlet,
  SfdxCommandletExecutor,
  SfdxWorkspaceChecker
} from './util';

class DataQueryExecutor extends SfdxCommandletExecutor<{}> {
  public build(data: QueryAndApiInputs): Command {
    let command = new SfdxCommandBuilder()
      .withDescription(nls.localize('data_query_input_text'))
      .withArg('data:query')
      .withFlag('--query', `${data.query}`)
      .withLogName('force_data_soql_query');
    if (data.api === ApiType.Tooling) {
      command = command
        .withArg('--use-tooling-api')
        .withLogName('force_data_soql_query_tooling');
    }
    return command.build();
  }
}

export class GetQueryAndApiInputs
  implements ParametersGatherer<QueryAndApiInputs> {
  public async gather(): Promise<
    CancelResponse | ContinueResponse<QueryAndApiInputs>
  > {
    const editor = await vscode.window.activeTextEditor;

    let query;

    if (!editor) {
      const userInputOptions = {
        prompt: nls.localize('parameter_gatherer_enter_soql_query')
      } as vscode.InputBoxOptions;
      query = await vscode.window.showInputBox(userInputOptions);
    } else {
      const document = editor.document;
      if (editor.selection.isEmpty) {
        const userInputOptions = {
          prompt: nls.localize('parameter_gatherer_enter_soql_query')
        } as vscode.InputBoxOptions;
        query = await vscode.window.showInputBox(userInputOptions);
      } else {
        query = document.getText(editor.selection);
      }
    }
    if (!query) {
      return { type: 'CANCEL' };
    }

    query = query
      .replace('[', '')
      .replace(']', '')
      .replace(/(\r\n|\n)/g, ' ');

    const restApi = {
      api: ApiType.REST,
      label: nls.localize('REST_API'),
      description: nls.localize('REST_API_description')
    };

    const toolingApi = {
      api: ApiType.Tooling,
      label: nls.localize('tooling_API'),
      description: nls.localize('tooling_API_description')
    };

    const apiItems = [restApi, toolingApi];
    const selection = await vscode.window.showQuickPick(apiItems);

    return selection
      ? { type: 'CONTINUE', data: { query, api: selection.api } }
      : { type: 'CANCEL' };
  }
}

export interface QueryAndApiInputs {
  query: string;
  api: ApiType;
}

export enum ApiType {
  REST,
  Tooling
}

const workspaceChecker = new SfdxWorkspaceChecker();

export async function dataQuery(explorerDir?: any) {
  const parameterGatherer = new GetQueryAndApiInputs();
  const commandlet = new SfdxCommandlet(
    workspaceChecker,
    parameterGatherer,
    new DataQueryExecutor()
  );
  await commandlet.run();
}
