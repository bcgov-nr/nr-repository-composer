'use strict';
import * as fs from 'fs';
import Generator from 'yeoman-generator';
import yosay from 'yosay';
import { parseDocument } from 'yaml';
import {
  BACKSTAGE_FILENAME,
  pathToProps,
  extractFromYaml,
  generateSetDefaultFromDoc,
  writePropToPath,
} from '../util/yaml.js';

/**
 * Generate a basic backstage file
 */
export default class extends Generator {
  async initializing() {
    const backstagePath = this.destinationPath(BACKSTAGE_FILENAME);
    if (fs.existsSync(backstagePath)) {
      const backstageYaml = fs.readFileSync(backstagePath, 'utf8');
      this.backstageDoc = parseDocument(backstageYaml);
    }
  }

  async prompting() {
    this.answers = extractFromYaml(this.backstageDoc, pathToProps);

    this.log(yosay('Welcome to the backstage file generator!'));

    const prompts = [
      {
        type: 'input',
        name: 'projectName',
        message: 'Project:',
      },
      {
        type: 'input',
        name: 'serviceName',
        message: 'Service:',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
      },
      {
        type: 'input',
        name: 'title',
        message: 'Title:',
      },
      {
        type: 'input',
        name: 'type',
        message: 'Type (service, website, library):',
      },
      {
        type: 'input',
        name: 'lifecycle',
        message: 'Lifecycle:',
      },
      {
        type: 'input',
        name: 'owner',
        message: 'Owner:',
      },
    ].map(generateSetDefaultFromDoc(this.answers));

    this.answers = await this.prompt(prompts);
  }

  writingBackstage() {
    writePropToPath(this.backstageDoc, pathToProps, this.answers);

    this.backstageDoc.setIn(['apiVersion'], 'backstage.io/v1alpha1');
    this.backstageDoc.setIn(['kind'], 'Component');

    this.fs.write(
      this.destinationPath(BACKSTAGE_FILENAME),
      this.backstageDoc.toString(),
    );
  }
}
