import React, { Component } from 'react';
import parseHydraDocumentation from './api-platform-api-doc-parser/hydra/parseHydraDocumentation';
//import { HydraAdmin, hydraClient, fetchHydra as baseFetchHydra } from './api-platform-admin/hydra/HydraAdmin';
import HydraAdmin from './api-platform-admin/hydra/HydraAdmin';
import hydraClient from './api-platform-admin/hydra/hydraClient';
import fetchHydra from './api-platform-admin/hydra/fetchHydra';
import { TextInput } from 'react-admin';
import authProvider from './authProvider';
import { Redirect } from 'react-router-dom';
import EllipsisTextField from '../src/EllipsisTextField.js';
import RichTextInput from 'ra-input-rich-text';
import CircularProgress from '@material-ui/core/CircularProgress';
import HttpsRedirect from 'react-https-redirect';
import {JssProvider, createGenerateClassName} from 'react-jss'

// One single Class generator function otherwise we will have funny CSS
// effects...
const generateClassName = createGenerateClassName()

const entrypoint = 'https://mizar.unive.it/catalogo_biflow/api/public/api';

// Let's set the authentication header only if it exists.
const fetchHeaders = new Headers();
if ('token' in window.localStorage) {
  fetchHeaders.append('Authorization', `Bearer ${window.localStorage.getItem('token')}`);
}

const myFetchHydra = (url, options = {}) => fetchHydra(url, {
    ...options,
    headers: fetchHeaders,
});

// Data range validator supports these types:
// >1234
// >~1234
// <1234
// <~1234
// 1234<>2345
// ~1234<>2345
// 1234<>~2345
// ~1234<>~2345
// 01-01-1234
// 01-1234
// ~1234
// 1234
// Before and after ~, <, >, <> spaces are supported.
const dateRangeValidator = (value, allValues) => {
    if (!value) {
      return null;
    }

    var regexp = /^(>\s*~?\s*\d\d\d\d|<\s*~?\s*\d\d\d\d|(~?\s*\d\d\d\d|\d\d-\d\d-\d\d\d\d|\d\d-\d\d\d\d)\s*<>\s*(~?\s*\d\d\d\d|\d\d-\d\d-\d\d\d\d|\d\d-\d\d\d\d)|\d\d-\d\d-\d\d\d\d|\d\d-\d\d\d\d|~\s*\d\d\d\d|\d\d\d\d|)$/
    if (regexp.exec(value) === null) {
      return 'The input does not follow the date constraints. The supported formats are "< 1500", "> 1500", "1300 <> 1500", "10-04-1516", "~1300", "1522".';
    }

    return null;
}

var toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
  //['blockquote', 'code-block'],

  //[{ 'header': 1 }, { 'header': 2 }],               // custom button values
  //[{ 'list': 'ordered'}, { 'list': 'bullet' }],
  [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
  //[{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
  //[{ 'direction': 'rtl' }],                         // text direction

  [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
  //[{ 'header': [1, 2, 3, 4, 5, 6, false] }],

  //[{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
  //[{ 'font': [] }],
  //[{ 'align': [] }],

  ['clean']                                         // remove formatting button
];

const dataProvider = api => hydraClient(api, myFetchHydra);
const apiDocumentationParser = entrypoint => parseHydraDocumentation(entrypoint, { headers: fetchHeaders })
    .then(
        ({ api }) => {
          // Let's implement our data input validator for these fields:
          const dateFields = [
            { entity: "people", fields: [ "dateBirth", "dateDeath" ]},
            { entity: "localisations", fields: [ "date" ]},
          ];

          dateFields.forEach(entity => {
            const resource = api.resources.find(({ name }) => entity.entity === name);
            entity.fields.forEach(fieldName => {
              const field = resource.fields.find(({ name }) => fieldName === name)
              field.input = props => (
                <TextInput key={field.name} source={field.name} label={field.name} validate={dateRangeValidator} {...props} />
              )
            });
          });

          // Let's ellipse the text inputs.
          api.resources.forEach(resource => {
            const fields = resource.fields.filter(({ range }) => range === "http://www.w3.org/2001/XMLSchema#string");
            fields.forEach(field => {
              field.field = props => (
                <EllipsisTextField key={field.name} source={field.name} {...props} />
              )

              field.field.defaultProps = { addLabel: true, };
            });
          });

          // Let's implement our data input validator for these fields:
          const multilineTextInputs = [
            { entity: "works", fields: [ "content", "otherTranslations" ]},
            { entity: "expressions", fields: [ "incipit", "explicit", "textualHistory", "manuscriptTradition", "editionHistory" ]},
            { entity: "manuscripts", fields: [ "physDescription", "history", "scriptDescription", "decoDescription", "collationDescription", "note" ]},
            { entity: "localisations", fields: [ "note" ]},
          ];

          multilineTextInputs.forEach(entity => {
            const resource = api.resources.find(({ name }) => entity.entity === name);
            entity.fields.forEach(fieldName => {
              const field = resource.fields.find(({ name }) => fieldName === name)
              field.input = props => (
                <RichTextInput key={field.name} source={field.name} label={field.name} toolbar={toolbarOptions} {...props} />
              )

              field.input.defaultProps = {
                addField: true,
                addLabel: true
              };
            });
          });

          // List of the main resources and their position in the UI. Any other
          // resource will be sorted by alphabetic order.
          let mainResources = [
            "people", "works", "expressions", "libraries", "manuscripts", "localisations"
          ];

          api.resources.sort((a, b) => {
            let aPos = mainResources.indexOf(a.name);
            let bPos = mainResources.indexOf(b.name);

            // Both a and b resources are part of the main ones. Let's make 'a'
            // to win.
            if (aPos !== -1 && bPos !== -1) return aPos > bPos;

            // Only 'a' is one of the main resources. It wins against anything
            // else.
            if (aPos !== -1) return false;

            // 'b' is one of the main resources. It wins.
            if (bPos !== -1) return true;

            // All the rest is alphabetically sorted.
            return a.name > b.name;
          });

          return { api };
        },
        (result) => {
            switch (result.status) {
                case 401:
                    return Promise.resolve({
                        api: result.api,
                        customRoutes: [{
                            props: {
                                path: '/',
                                render: () => <Redirect to={`/login`}/>,
                            },
                        }],
                    });

                default:
                    return Promise.reject(result);
            }
        },
    );

// List of fields we want to hide from the list.
const hiddenFromList = [
  { entity: "people", fields: [ "attributedWorks", "attributedExpressions", "works", "translations", "codices", "nicknames", ]},
  { entity: "works", fields: [ "content", "otherTranslations", "attributions", "relatedWorks", "genres", "expressions", "editor", "bibliographies", ]},
  { entity: "expressions", fields: [
    "translator", "incipit", "explicit", "textualHistory",
    "manuscriptTradition", "editionHistory", "bibliographies",
    "textualTypology", "localisations", "attributions", "date",
    "derivedFromExpressions", "derivedExpressions", "language",
    "otherLanguages",]},
  { entity: "manuscripts", fields: [ "typology", "place", "material",
    "physDescription", "history", "width", "height", "scriptDescription",
    "decoDescription", "collationDescription", "binding", "ruledLines",
    "ruledLineTechnique", "checkStatus", "note", "content", "bibliographies",
    "localisations", "link", "editor", "library"]},
  { entity: "localisations", fields: ["manuscript", "copyist", "date", "note", "expression" ]},
  { entity: "libraries", fields: ["manuscripts"]},
  { entity: "bibliographies", fields: ["works", "manuscripts", "chapter", "editor", "volume", "volumeNumber", "place", "date", "publisher", "journal", "journalNumber", "pageNumber", "url"]},
  { entity: "check_statuses", fields: ["manuscripts",]},
  { entity: "editors", fields: ["works", "manuscripts",]},
  { entity: "genres", fields: ["works",]},
  { entity: "languages", fields: ["expressions", "otherExpressions",]},
  { entity: "materials", fields: ["manuscripts",]},
  { entity: "nicknames", fields: ["person",]},
  { entity: "publications", fields: ["chapter", "volume", "volumeNumber", "place", "date", "publisher", "journal", "journalNumber", "pageNumber", "url", "abstract", "category"]},
  { entity: "ruled_line_techniques", fields: ["manuscripts"]},
  { entity: "textual_typologies", fields: ["expressions"]},
  { entity: "typologies", fields: ["manuscripts"]},
  { entity: "publication_categories", fields: ["publications"]},
];

const listFieldFilter = (resource, field) => {
  const hiddenResource = hiddenFromList.find(hidden => hidden.entity === resource.name);
  return !hiddenResource || !hiddenResource.fields.includes(field.name);
};

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ready: false
    }
  }

  // Login check at the first loading.
  componentDidMount() {
    if (!('token' in window.localStorage)) {
      this.setState({ready: true});
      return;
    }

    fetch(entrypoint, { headers: fetchHeaders }).then(r => {
      this.setState({ready: true});
      if (r.status === 401) {
        delete localStorage.token;
        window.location.reload();
      }
      this.setState({ready: true});
    });
  }

  render() {
    if (this.state.ready === false) {
      return <CircularProgress />
    }

    return (
      <JssProvider generateClassName={generateClassName}>
        <HttpsRedirect>
          <HydraAdmin
            apiDocumentationParser={apiDocumentationParser}
            authProvider={authProvider}
            entrypoint={entrypoint}
            dataProvider={dataProvider}
            listFieldFilter={listFieldFilter}
          />
        </HttpsRedirect>
      </JssProvider>
    );
  }
}

export default App;
