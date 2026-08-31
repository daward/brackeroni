import assert from "node:assert/strict";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { openApiDocument } from "../../openapi/document.js";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const compiledRequestSchemas = new Map();
const compiledResponseSchemas = new Map();

function lookupDocumentPointer(pointer) {
  return pointer
    .slice(2)
    .split("/")
    .reduce((value, part) => value?.[part.replaceAll("~1", "/").replaceAll("~0", "~")], openApiDocument);
}

function schemaFromContent(content) {
  return content?.["application/json"]?.schema;
}

function dereferenceSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  if (schema.$ref) {
    return dereferenceSchema(lookupDocumentPointer(schema.$ref));
  }

  if (Array.isArray(schema)) {
    return schema.map(dereferenceSchema);
  }

  return Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [key, dereferenceSchema(value)])
  );
}

function operationFor(method, path) {
  const operation = openApiDocument.paths[path]?.[method.toLowerCase()];

  assert.ok(operation, `${method.toUpperCase()} ${path} is not documented`);

  return operation;
}

function schemaForRequest(method, path) {
  const schema = schemaFromContent(operationFor(method, path).requestBody?.content);

  assert.ok(schema, `${method.toUpperCase()} ${path} does not document a JSON request body`);

  return dereferenceSchema(schema);
}

function schemaForResponse(method, path, status) {
  const response = dereferenceSchema(operationFor(method, path).responses[String(status)]);
  const schema = schemaFromContent(response?.content);

  assert.ok(schema, `${method.toUpperCase()} ${path} does not document a ${status} JSON response`);

  return dereferenceSchema(schema);
}

export function expectValidRequest(method, path, body) {
  const key = `${method.toLowerCase()} ${path}`;
  let validate = compiledRequestSchemas.get(key);

  if (!validate) {
    validate = ajv.compile(schemaForRequest(method, path));
    compiledRequestSchemas.set(key, validate);
  }

  assert.equal(validate(body), true, ajv.errorsText(validate.errors));
}

export function expectValidResponse(method, path, status, body) {
  const key = `${method.toLowerCase()} ${path} ${status}`;
  let validate = compiledResponseSchemas.get(key);

  if (!validate) {
    validate = ajv.compile(schemaForResponse(method, path, status));
    compiledResponseSchemas.set(key, validate);
  }

  assert.equal(validate(body), true, ajv.errorsText(validate.errors));
}

export function routeRequest(path, { method = "GET", body } = {}) {
  const url = new URL(path, "http://localhost");

  return {
    method,
    url: url.toString(),
    nextUrl: url,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => {
      if (body === undefined) {
        throw new SyntaxError("No request body");
      }

      return body;
    }
  };
}

export async function responseJson(response) {
  return response.json();
}
