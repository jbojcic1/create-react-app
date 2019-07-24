// @remove-file-on-eject
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const chalk = require('react-dev-utils/chalk');
const fs = require('fs');
const resolve = require('resolve');
const path = require('path');
const paths = require('../../config/paths');
const os = require('os');
const immer = require('react-dev-utils/immer').produce;
const globby = require('react-dev-utils/globby').sync;

function writeJson(fileName, object) {
  fs.writeFileSync(
    fileName,
    JSON.stringify(object, null, 2).replace(/\n/g, os.EOL) + os.EOL
  );
}

function verifyNoTypeScript() {
  const typescriptFiles = globby(
    ['**/*.(ts|tsx)', '!**/node_modules', '!**/*.d.ts'],
    { cwd: paths.appSrc }
  );
  if (typescriptFiles.length > 0) {
    console.warn(
      chalk.yellow(
        `We detected TypeScript in your project (${chalk.bold(
          `src${path.sep}${typescriptFiles[0]}`
        )}) and created a ${chalk.bold('tsconfig.json')} file for you.`
      )
    );
    console.warn();
    return false;
  }
  return true;
}

function verifyTypeScriptSetup() {
  let firstTimeSetup = false;

  if (!fs.existsSync(paths.appTsConfig)) {
    if (verifyNoTypeScript()) {
      return;
    }
    writeJson(paths.appTsConfig, {});
    firstTimeSetup = true;
  }

  const isYarn = fs.existsSync(paths.yarnLockFile);

  // Ensure typescript is installed
  let ts;
  try {
    ts = require(resolve.sync('typescript', {
      basedir: paths.appNodeModules,
    }));
  } catch (_) {
    console.error(
      chalk.bold.red(
        `It looks like you're trying to use TypeScript but do not have ${chalk.bold(
          'typescript'
        )} installed.`
      )
    );
    console.error(
      chalk.bold(
        'Please install',
        chalk.cyan.bold('typescript'),
        'by running',
        chalk.cyan.bold(
          isYarn ? 'yarn add typescript' : 'npm install typescript'
        ) + '.'
      )
    );
    console.error(
      chalk.bold(
        'If you are not trying to use TypeScript, please remove the ' +
          chalk.cyan('tsconfig.json') +
          ' file from your package root (and any TypeScript files).'
      )
    );
    console.error();
    process.exit(1);
  }

  const compilerOptions = {
    // These are suggested values and will be set when not present in the
    // tsconfig.json
    // 'parsedValue' matches the output value from ts.parseJsonConfigFileContent()
    target: {
      parsedValue: ts.ScriptTarget.ES5,
      suggested: 'es5',
    },
    lib: { suggested: ['dom', 'dom.iterable', 'esnext'] },
    allowJs: { suggested: true },
    skipLibCheck: { suggested: true },
    esModuleInterop: { suggested: true },
    allowSyntheticDefaultImports: { suggested: true },
    strict: { suggested: true },
    forceConsistentCasingInFileNames: { suggested: true },
    // TODO: Enable for v4.0 (#6936)
    // noFallthroughCasesInSwitch: { suggested: true },

    // These values are required and cannot be changed by the user
    // Keep this in sync with the webpack config
    module: {
      parsedValue: ts.ModuleKind.ESNext,
      value: 'esnext',
      reason: 'for import() and import/export',
    },
    moduleResolution: {
      parsedValue: ts.ModuleResolutionKind.NodeJs,
      value: 'node',
      reason: 'to match webpack resolution',
    },
    resolveJsonModule: { value: true, reason: 'to match webpack loader' },
    isolatedModules: { value: true, reason: 'implementation limitation' },
    noEmit: { value: true },
    jsx: {
      parsedValue: ts.JsxEmit.Preserve,
      value: 'preserve',
      reason: 'JSX is compiled by Babel',
    }
  };

  const formatDiagnosticHost = {
    getCanonicalFileName: fileName => fileName,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => os.EOL,
  };

  const messages = [];
  let appTsConfig;
  let parsedTsConfig;
  let parsedCompilerOptions;
  try {
    const { config: readTsConfig, error } = ts.readConfigFile(
      paths.appTsConfig,
      ts.sys.readFile
    );

    if (error) {
      throw new Error(ts.formatDiagnostic(error, formatDiagnosticHost));
    }

    appTsConfig = readTsConfig;
    console.log('appTsConfig: ', appTsConfig);
    console.log('readTsConfig: ', readTsConfig);

    // Get TS to parse and resolve any "extends"
    // Calling this function also mutates the tsconfig above,
    // adding in "include" and "exclude", but the compilerOptions remain untouched
    let result = null;
    parsedTsConfig = immer(readTsConfig, config => {
      result = ts.parseJsonConfigFileContent(
        config,
        ts.sys,
        path.dirname(paths.appTsConfig)
      );
    });
    console.log('appTsConfig: ', appTsConfig);
    console.log('readTsConfig: ', readTsConfig);
    console.log('parsedTsConfig: ', parsedTsConfig);

    if (result && result.options)
      console.log('result: ', result.options);

    if (result.errors && result.errors.length) {
      throw new Error(
        ts.formatDiagnostic(result.errors[0], formatDiagnosticHost)
      );
    }

    parsedCompilerOptions = result.options;
    console.log('parsedCompilerOptions: ', parsedCompilerOptions);
  } catch (e) {
    if (e && e.name === 'SyntaxError') {
      console.error(
        chalk.red.bold(
          'Could not parse',
          chalk.cyan('tsconfig.json') + '.',
          'Please make sure it contains syntactically correct JSON.'
        )
      );
    }

    console.log(e && e.message ? `${e.message}` : '');
    process.exit(1);
  }

  if (appTsConfig.compilerOptions == null) {
    appTsConfig.compilerOptions = {};
    firstTimeSetup = true;
  }

  console.log('appTsConfig: ', appTsConfig);

  for (const option of Object.keys(compilerOptions)) {
    const { parsedValue, value, suggested, reason } = compilerOptions[option];
    console.log('parsedValue: ', parsedValue);
    console.log('value: ', value);
    console.log('suggested: ', suggested);
    console.log('reason: ', reason);

    const valueToCheck = parsedValue === undefined ? value : parsedValue;
    const coloredOption = chalk.cyan('compilerOptions.' + option);

    if (suggested != null) {
      if (parsedCompilerOptions[option] === undefined) {
        console.log(`Setting ${option} to ${suggested}`);
        appTsConfig.compilerOptions[option] = suggested;
        messages.push(
          `${coloredOption} to be ${chalk.bold(
            'suggested'
          )} value: ${chalk.cyan.bold(suggested)} (this can be changed)`
        );
      }
    } else if (parsedCompilerOptions[option] !== valueToCheck) {
      console.log(`Setting ${option} to ${value}`);
      appTsConfig.compilerOptions[option] = value;
      messages.push(
        `${coloredOption} ${chalk.bold(
          valueToCheck == null ? 'must not' : 'must'
        )} be ${valueToCheck == null ? 'set' : chalk.cyan.bold(value)}` +
          (reason != null ? ` (${reason})` : '')
      );
    }
  }

  console.log('after changes');
  console.log('appTsConfig: ', appTsConfig);


  // tsconfig will have the merged "include" and "exclude" by this point
  if (parsedTsConfig.include == null) {
    appTsConfig.include = ['src'];
    messages.push(
      `${chalk.cyan('include')} should be ${chalk.cyan.bold('src')}`
    );
  }

  if (messages.length > 0) {
    if (firstTimeSetup) {
      console.log(
        chalk.bold(
          'Your',
          chalk.cyan('tsconfig.json'),
          'has been populated with default values.'
        )
      );
      console.log();
    } else {
      console.warn(
        chalk.bold(
          'The following changes are being made to your',
          chalk.cyan('tsconfig.json'),
          'file:'
        )
      );
      messages.forEach(message => {
        console.warn('  - ' + message);
      });
      console.warn();
    }
    writeJson(paths.appTsConfig, appTsConfig);
  }

  // Reference `react-scripts` types
  if (!fs.existsSync(paths.appTypeDeclarations)) {
    fs.writeFileSync(
      paths.appTypeDeclarations,
      `/// <reference types="react-scripts" />${os.EOL}`
    );
  }
}

module.exports = verifyTypeScriptSetup;
