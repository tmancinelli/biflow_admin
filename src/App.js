import React from 'react';
import parseHydraDocumentation from '@api-platform/api-doc-parser/lib/hydra/parseHydraDocumentation';
import { HydraAdmin, hydraClient, fetchHydra as baseFetchHydra } from '@api-platform/admin';
import { TextInput } from 'react-admin';
import authProvider from './authProvider';
import { Redirect } from 'react-router-dom';

const entrypoint = 'https://sandbox.cceh.uni-koeln.de';
const fetchHeaders = {'Authorization': `Bearer ${window.localStorage.getItem('token')}`};
const fetchHydra = (url, options = {}) => baseFetchHydra(url, {
    ...options,
    headers: new Headers(fetchHeaders),
});

const dateRangeValidator = (value, allValues) => {
    if (!value) {
      return null;
    }

    var regexp = /^(>\s*\d\d\d\d|<\s*\d\d\d\d|\d\d\d\d\s*<>\s*\d\d\d\d|\d\d-\d\d-\d\d\d\d)$/
    if (regexp.exec(value) === null) {
      return 'The input does not follow the date constraints. The supported formats are "< 1500", "> 1500", "1300 <> 1500", "10-04-1516".';
    }

    return null;
}

const dataProvider = api => hydraClient(api, fetchHydra);
const apiDocumentationParser = entrypoint => parseHydraDocumentation(entrypoint, { headers: new Headers(fetchHeaders) })
    .then(
        ({ api }) => {
          const dateFields = [
            { entity: "people", fields: [ "dateBirth", "dateDeath" ]},
            { entity: "manuscripts", fields: [ "date" ]},
          ];

          dateFields.forEach(entity => {
            const resource = api.resources.find(({ name }) => entity.entity === name);
            entity.fields.forEach(fieldName => {
              const field = resource.fields.find(({ name }) => fieldName === name)
              field.input = props => (
                <TextInput source={field.name} label={field.name} validate={dateRangeValidator} {...props} />
              )
            });
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

export default props => (
    <HydraAdmin
        apiDocumentationParser={apiDocumentationParser}
        authProvider={authProvider}
        entrypoint={entrypoint}
        dataProvider={dataProvider}
    />
);
