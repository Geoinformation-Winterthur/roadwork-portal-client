# Web UI of the Roadworks Portal Client Application

This is the client-side component of the roadworks portal application of the City Administration of Winterthur.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/civil-engineering/roadworks-portal/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

Example command to build for production environment (DO NOT USE THIS WITH GIT BASH):
`ng build --configuration production --aot --outputHashing=all`
=> Before this command: INCREMENT VERSION NUMBER in package.json, package-lock.json and welcome.component.ts.

Example command to build for test environment (DO NOT USE THIS WITH GIT BASH):
`ng build --configuration test --aot --outputHashing=all`

### Develop in container

1.  `npm run docker:dev`  
2.  Browser: `http://localhost:4200`  
3.  Stop: `npm run docker:stop`

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
