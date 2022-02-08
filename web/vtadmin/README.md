# VTAdmin

VTAdmin is a browser interface and HTTP API for administering Vitess deployments. This codebase contains the code for the browser interface, vtadmin-web; the code for the HTTP API, vtadmin-api, is found at [`go/vt/vtadmin/`](../../go/vt/vtadmin/).

## Security

To report a security vulnerability, please email [vitess-maintainers](mailto:cncf-vitess-maintainers@lists.cncf.io).

See [Security](SECURITY.md) for a full outline of the security process.

For instructions on updating dependencies in this codebase, see [Updating Dependencies](#updating-dependencies). 

## Prerequisites

In order to run and/or build vtadmin-web, you will need the following:

- [node](https://nodejs.org) >= 16.13.0 LTS
- npm >= 8.1.0 (comes with node)


## Available scripts

Scripts for common and not-so-common tasks. These are always run from the `vitess/web/vtadmin` directory (although some of them have counterparts in `vitess/Makefile`):

| Command | Description |
|---|---|
| `npm local` | Start vtadmin-web in development mode on [http://localhost:3000](http://localhost:3000), pointed at a vtadmin-api server running on [http://localhost:14200](http://localhost:14200). This is most useful when running against a [local Vitess cluster](https://vitess.io/docs/get-started/local/). |
| `npm start` | Start vtadmin-web in development mode on [http://localhost:3000](http://localhost:3000). Additional environment variables can be specified on the command line or in a .env file; see [Environment Variables](#environment-variables). |
| `npm run test` | Launches the test runner in the interactive watch mode. See the create-react-app documentation about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information. |
| `npm run lint` | Run all of the linters and formatters. The `package.json` file defines a bunch more scripts to run individual linters, if you prefer, like `npm run lint:eslint`. |
| `npm run lint:fix` | Run all of the linters and fix errors (where possible) in place. Note that this will overwrite your files so you may want to consider committing your work beforehand! |
| `npm run build` | Generates a build of vtadmin-web for production and outputs the files to the `vitess/web/vtadmin/build` folder. In most cases, you won't need to run this locally, but it _can_ be useful for debugging production-specific issues. See the create-react-app documentation about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information. |
| `npm run analyze` | Analyze and debug JavaScript build size using [source-map-explorer](https://create-react-app.dev/docs/analyzing-the-bundle-size/). In most cases, you'll first want to run `npm run build` to update the `build/` directory. |

## Toolchain

- [React](https://reactjs.org/)
- [create-react-app](https://create-react-app.dev/) (generated with v.4.0.1)
- [TypeScript](http://typescriptlang.org/)
- [protobufjs](https://github.com/protobufjs)
- [tailwindcss](https://tailwindcss.com/)

## Environment Variables

Under the hood, we use create-react-app's environment variable set-up which is very well documented: https://create-react-app.dev/docs/adding-custom-environment-variables. 

All of our environment variables are enumerated and commented in [react-app-env.d.ts](./src/react-app-env.d.ts). This also gives us type hinting on `process.env`, for editors that support it. 

## Updating Dependencies

We aim to keep our dependencies up to date, and to fix vulnerabilities quickly. Updating dependencies ins't always straightforward, so this section offers some guidance. 

Dependencies can be one of:
- Direct dependencies, which are the packages listed in the [package.json](./package.json) file, along with a semver.
- nth-order dependencies, which are nested packages included by direct dependencies. 

For both direct dependencies and nth-order dependencies, the _exact_ versions we are using are "pinned" in the [package-lock.json](./package-lock.json) file.

In most cases, we only need to update direct dependencies. Security vulnerabilties, however, may require updating nth-order dependencies directly. Both scenarios are described below. 

### Step 0: Prerequisites for updating

1. Check that you have the correct versions of node/npm as described in [Prerequisites](#prerequisites].
2. Ensure that you have a clean install: `rm -rf node_modules && npm install`

### Step 1: Identify the package in the dependency tree. 

When updating a package, first check if it is a direct dependency or an nth-order dependency with [npm list](https://docs.npmjs.com/cli/v7/commands/npm-ls). 

```bash
# The "dayjs" package is a direct dependency

$ npm list dayjs
vtadmin@0.1.0 /Users/sara/workspace/vitess/web/vtadmin
└── dayjs@1.10.7

# "nanoid" is a second-order dependency; we don't include it directly,
# but it is used by the "postcss" package (which is a direct dependency). 

$ npm list nanoid
vtadmin@0.1.0 /Users/sara/workspace/vitess/web/vtadmin
└─┬ postcss@8.4.6
  └── nanoid@3.2.0

# "react" is both a direct dependency, and a peer dependency
# of several other packages.
$ npm list react
vtadmin@0.1.0 /Users/sara/workspace/vitess/web/vtadmin
├─┬ @headlessui/react@1.4.2
│ └── react@17.0.1 deduped
├─┬ @testing-library/react-hooks@5.1.3
│ ├─┬ react-error-boundary@3.1.4
│ │ └── react@17.0.1 deduped
│ └── react@17.0.1 deduped
├─┬ @testing-library/react@11.2.7
│ └── react@17.0.1 deduped
├─┬ downshift@6.1.7
│ └── react@17.0.1 deduped
├─┬ highcharts-react-official@3.1.0
│ └── react@17.0.1 deduped
├─┬ react-dom@17.0.1
│ └── react@17.0.1 deduped
├─┬ react-query@3.5.9
│ └── react@17.0.1 deduped
├─┬ react-router-dom@5.3.0
│ ├─┬ react-router@5.2.1
│ │ ├─┬ mini-create-react-context@0.4.1
│ │ │ └── react@17.0.1 deduped
│ │ └── react@17.0.1 deduped
│ └── react@17.0.1 deduped
├─┬ react-scripts@5.0.0
│ └── react@17.0.1 deduped
├─┬ react-tiny-popover@6.0.10
│ └── react@17.0.1 deduped
├─┬ react-toastify@8.1.0
│ └── react@17.0.1 deduped
└── react@17.0.1
```

⚠️ If `npm list` is giving you empty output, ensure you have the correct version of node and npm as described in [Prerequisites](#prerequisites), and that you have run `npm install`. `npm list` lists works from the _installed_ packages in your `node_modules/` folder.

### Step 2: Identify the target version

[`npm outdated`](https://docs.npmjs.com/cli/v7/commands/npm-outdated) checks the npm registry to see if any (or, specific) installed packages are currently outdated. In some cases, as with security vulnerabilities, you may already have a target version in mind.

For the sake of example, let's update the `react` package:

```bash
🍕~/workspace/vitess/web/vtadmin $ npm outdated react
Package  Current  Wanted  Latest  Location            Depended by
react     17.0.1  17.0.2  17.0.2  node_modules/react  react-error-boundary
react     17.0.1  17.0.1  17.0.2  node_modules/react  react-dom
react     17.0.1  17.0.2  17.0.2  node_modules/react  highcharts-react-official
react     17.0.1  17.0.2  17.0.2  node_modules/react  react-query
react     17.0.1  17.0.2  17.0.2  node_modules/react  react-router
react     17.0.1  17.0.2  17.0.2  node_modules/react  @testing-library/react-hooks
react     17.0.1  17.0.2  17.0.2  node_modules/react  react-scripts
react     17.0.1  17.0.2  17.0.2  node_modules/react  vtadmin
react     17.0.1  17.0.2  17.0.2  node_modules/react  react-tiny-popover
react     17.0.1  17.0.2  17.0.2  node_modules/react  downshift
react     17.0.1  17.0.2  17.0.2  node_modules/react  @headlessui/react
react     17.0.1  17.0.2  17.0.2  node_modules/react  react-toastify
react     17.0.1  17.0.2  17.0.2  node_modules/react  @testing-library/react
react     17.0.1  17.0.2  17.0.2  node_modules/react  react-router-dom
react     17.0.1  17.0.2  17.0.2  node_modules/react  mini-create-react-context
```

Note that the react package is shown both as a direct dependency ("Depended by: vtadmin") and an nth-order dependency for several other packages. Also note that the "Wanted" versions can vary.

(TODO: add a note about "Wanted" vs. "Latest".) 

In our case, our target version is `react@17.0.2`. 

### Step 3: View the package's changelog

It is _always_ a good idea to check a package's changelog for breaking or otherwise relevant changes. Even for minor releases, even for nth-order dependencies. 

Searching for a package on https://www.npmjs.com/ will lead you to the package's GitHub repo, where you should be able to find a CHANGELOG.md file. [Here is react's, for example](https://github.com/facebook/react/blob/main/CHANGELOG.md). 


### Step 4: Update the package

The mechanism for updating a package depends on whether it is a direct dependency or an nth-order dependency.

**For direct dependencies,**



## Linters and Formatters

We use three libraries for consistent formatting and linting across the front-end codebase. (Not quite as streamlined as Go, alas!) These can be run individually, as noted below, or all in sequence with `npm run lint`.

| Library | Commands | What it's for |
|---------|----------|---------------|
| [eslint](https://eslint.org/) | `npm run lint:eslint`<br/><br/>`npm run lint:eslint:fix` | ESLint identifies potential bugs and other issues. vtadmin-web uses the default ESLint configuration [built in to create-react-app](https://create-react-app.dev/docs/setting-up-your-editor/#extending-or-replacing-the-default-eslint-config). |
| [prettier](https://prettier.io/) | `npm run lint:prettier`<br/><br/>`npm run lint:prettier:fix` | Prettier is an "opinionated code formatter" run against our JavaScript, TypeScript, and (S)CSS code to ensure a consistent style. Prettier is not a linter, and so it complements (rather than replaces) eslint/stylelint. | 
| [stylelint](https://stylelint.io/) | `npm run lint:stylelint`<br/><br/>`npm run lint:stylelint:fix` | Stylelint is a linter for CSS/SCSS. Whereas prettier's CSS/SCSS support is largely focused on formatting (newlines, spaces vs. tabs), stylelint is able to flag possible errors, limit language features, and surface stylistic issues that prettier isn't intended to catch. |

## Configuring your editor

### VS Code

To set up automatic formatting on save:

1. Install the [Prettier VS Code plugin](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode).
2. Add the following to your VS Code workspace:

```js
{
	// ... other workspace config ...

	"settings": {
		// ... other settings ..

		"prettier.useEditorConfig": false,

		// You may have to adjust this depending on which folder is the root of your workspace.
		// By default, this configuration assumes that you have your workspace settings 
		// at `vitess/.vscode/settings.json`. 
		"prettier.configPath": "web/vtadmin/.prettiercc",
		
		"[typescriptreact]": {
			"editor.defaultFormatter": "esbenp.prettier-vscode",
			"editor.formatOnSave": true,
		},
		
		"[typescript]": {
			"editor.defaultFormatter": "esbenp.prettier-vscode",
			"editor.formatOnSave": true,
		},
		
		"[javascript]": {
			"editor.defaultFormatter": "esbenp.prettier-vscode",
			"editor.formatOnSave": true,
		},

		"[css]": {
			"editor.defaultFormatter": "esbenp.prettier-vscode",
			"editor.formatOnSave": true,
			"editor.codeActionsOnSave": {
				"source.fixAll.stylelint": true
			}
		},

		"[scss]": {
			"editor.defaultFormatter": "esbenp.prettier-vscode",
			"editor.formatOnSave": true,
			"editor.codeActionsOnSave": {
				"source.fixAll.stylelint": true
			}
		}
	}
}
```

For more, check out ["Setting Up Your Editor"](https://create-react-app.dev/docs/setting-up-your-editor/) in the create-react-app docs.
