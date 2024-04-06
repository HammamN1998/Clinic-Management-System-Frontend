import {defaultEenvironment} from "./environment.default";

export const environment = {
  ...defaultEenvironment,
  apiUrl: 'http://localhost:4200', // TODO: change this to cloud host
  production: true,
};
