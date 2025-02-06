import { parse, DocumentNode, SelectionNode } from "graphql";
import { findArgumentByName } from "../../../src/utils/graphql";
import { findQueryByName } from "../../../src/utils/graphql";

describe("findArgumentByName", () => {
  let documentWithVariable: DocumentNode;
  let documentWithLiteral: DocumentNode;

  beforeAll(() => {
    // Query with a variable argument ($id)
    documentWithVariable = parse(`
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
        }
      }
    `);

    // Query with a direct value argument ("5678")
    documentWithLiteral = parse(`
      query GetProduct {
        product(id: "5678") {
          id
          name
        }
      }
    `);
  });

  it("should return the resolved variable value instead of the variable reference", () => {
    const selection = findQueryByName(documentWithVariable, "user");
    expect(selection).toBeDefined();

    const variables = { id: "1234" };
    const argumentValue = findArgumentByName(selection!, variables, "id");

    expect(argumentValue).toBe("1234");
  });

  it("should return the actual argument value if it is a literal", () => {
    const selection = findQueryByName(documentWithLiteral, "product");
    expect(selection).toBeDefined();

    const argumentValue = findArgumentByName(selection!, {}, "id");

    expect(argumentValue).toBe("5678");
  });

  it("should return undefined if argument does not exist", () => {
    const selection = findQueryByName(documentWithVariable, "user");
    expect(selection).toBeDefined();

    const argumentValue = findArgumentByName(selection!, {}, "nonexistentArg");

    expect(argumentValue).toBeUndefined();
  });

  it("should return undefined if selection is not a Field", () => {
    const invalidSelection = { kind: "InlineFragment" } as SelectionNode;
    const result = findArgumentByName(invalidSelection, {}, "id");
    expect(result).toBeUndefined();
  });

  it("should return undefined if argument does not exist", () => {
    const selection = findQueryByName(documentWithVariable, "user");
    expect(selection).toBeDefined();

    const argumentValue = findArgumentByName(selection!, {}, "nonexistentArg");

    expect(argumentValue).toBeUndefined();
  });

  it("should return undefined if document does not contain a query operation", () => {
    const invalidDocument = parse(`
    mutation CreateUser {
      createUser(name: "Test") {
        id
      }
    }
  `);

    const selection = findQueryByName(invalidDocument, "user");
    expect(selection).toBeUndefined();
  });
});
