# ol-ts

open-layers converted to typescript

## Managing the Workspace

VS Code does does a good job managing Nx workspaces through the
[Nx Console Extension](https://marketplace.visualstudio.com/items?itemName=nrwl.angular-console).
If you don't use VS Code, you can use the command line to manage the workspace:

```bash
# Create a new react library.
pnpm exec nx generate @nx/react:library \
    --name=some-name \
    --unitTestRunner=jest \
    --bundler=rollup  \
    --component=false \
    --importPath=@yournamespace/some-name \
    --publishable=true  \
    --style=none \
    --tags="a b c" \
    --no-interactive --dry-run

# Create a CLI application.
pnpm exec nx generate @nx/js:library \
    --name=g11n-cli \
    --unitTestRunner=jest \
    --bundler=rollup \
    --directory=apps \
    --publishable=true \
    --importPath=@vebgen/g11n-cli \
    --includeBabelRc=true \
    --testEnvironment=node \
    --no-interactive --dry-run

# Run tests in all projects.
pnpm exec nx run-many --target=test --all

# Build all projects.
pnpm exec nx run-many --target=build --all
```

## Folder Structure

### Top Level

#### README.md

This file

#### .editorconfig

Defines and maintains consistent coding styles between different
editors and IDEs.

#### .gitignore

Files and folders that should not be tracked by git.

#### .npmrc

Configuration file for package managers (here is
[pnpm](https://pnpm.io/next/npmrc)):

- `strict-peer-dependencies`: `true` - If this is enabled, commands
  will fail if there is a missing or invalid peer
  dependency in the tree;
- `auto-install-peers`: `true` - peer dependencies will
  be automatically installed when installing packages;
- `public-hoist-pattern`: hoists dependencies matching the
  pattern to the root modules directory (application code
  will have access to phantom dependencies, even if
  they modify the resolution strategy improperly);

#### .prettierignore

The files used for excluding files from formatting by
[Prettier](https://prettier.io/docs/en/ignore.html).

By default prettier ignores files in version control systems
directories (".git", ".svn" and ".hg") and `node_modules`

#### .prettierrc

[Prettier](https://prettier.io/docs/en/configuration.html)
uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig)
for configuration file support.

#### babel.config.json

[Babel](https://babeljs.io/docs/en/configuration) configuration:

- `babelrcRoots`: `[".", "packages/*", "apps/*"]` - tells Babel to use
  the root directory and the packages directory as the root
  directories for Babel configuration files;

#### jest.config.ts

#### jest.preset.js

#### LICENSE

Describes how the code in this folder can be used.

#### .eslintignore

Files and folders that should not be linted by eslint.

#### package.json

Describes the project and its dependencies.

#### pnpm-workspace.yaml

Defines the root of the workspace and enables us to include /
exclude directories from the workspace
See [pnpm-workspace.yaml](https://pnpm.io/pnpm-workspace_yaml).

Our configuration includes everything under the `packages`
and `apps` directory.

#### tsconfig.base.json

TypeScript [configuration](https://www.typescriptlang.org/tsconfig)
imported by all other tsconfig files.

We use following settings:

- `compileOnSave` - enables automatic compilation of the project
  after saving any file;
- `compilerOptions`:
  - `rootDir`: `.` - the root directory of the project; does not
    affect which files become part of the compilation;
  - `sourceMap`: enables generation of
    [source maps](https://developer.mozilla.org/docs/Tools/Debugger/How_to/Use_a_source_map);
  - `declaration`: generate `.d.ts` files for every TypeScript
    or JavaScript file inside each project;
  - `emitDecoratorMetadata`: enables the emitting of type metadata
    `experimentalDecorators`: enables the use of
    [decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
    in TypeScript;
  - `importHelpers`: enables the use of
    [tslib](https://www.npmjs.com/package/tslib) library;
  - `target`: `es2015` = `es6` - the version of ECMAScript to which the
    code should be compiled;
  - `module`: `esnext` - the [module system](https://www.javascripttutorial.net/es-next/) to use;
  - `lib`: `["es2020", "dom"]` - the set of
    [built-in declarations](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
    that TypeScript will include when compiling the code; the code
    will include all the features from ES2020 and the DOM API;
  - `skipLibCheck`: `true` - disables type checking of declaration
    files;
  - `skipDefaultLibCheck`: `true` - disables type checking of
    default library declaration files;
  - `baseUrl`: `.` - the base directory to resolve non-relative
    module names (so files can be imported using `packages/lib/file.ts`);
  - `paths`: enables the use of
    [path mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping)
    in TypeScript; we add each package's `index.ts` to the paths so we can import
    its content using `@olts/some-package`;
- `exclude`: `["node_modules", "dist"]` - files and folders that
  should not be part of the compilation; it is not a mechanism that
  prevents a file from being included in the codebase - it
  simply changes what the include setting finds.

#### nx.json

Configuration for [Nx](https://nx.dev/reference/nx-json):

- `$schema`: the schema used to validate the configuration;
- `extends`: `nx/presets/npm.json`: ended up not using this as the
  content was copied to this file;
- `$affected`: tells Nx which branch and HEAD to use when
  calculating affected projects;
- `tasksRunnerOptions`: a task is an invocation of a target; the
  tasks runner named `default` is used by default; specify a
  different one like this `nx run-many -t build --all --runner=another`.
  - `default`: the default tasks runner;
    - `runner`: `nx-plugin:nx-plugin` - the name of the plugin
      that implements the tasks runner;
    - `options`:
      - `cacheableOperations`: defines the list of
        targets/operations that are cached by Nx
      - `cacheDirectory`: the directory where Nx stores the
        cache;
- `$targetDefaults`: provide ways to set common options
  for a particular target in your workspace
- `pluginsConfig`: configuration for the plugins used by Nx;
  - `@nx/js`:
    - `analyzeSourceFiles`: `true` - enables the analysis of
      source files (detecting dependencies from source code
      and not only use the dependencies as defined in package.json);
- `$namedInputs`: Named inputs defined in `nx.json` are
  merged with the named inputs defined in each
  project's `project.json`
- `generators`:
  - `@nx/react`:
  - `@nx/js`:
