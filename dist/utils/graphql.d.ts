import { DocumentNode, SelectionNode } from "graphql";
export declare const findQueryByName: (document: DocumentNode, queryName: string) => SelectionNode | undefined;
export declare const findArgumentByName: (selection: SelectionNode, variables: object, argumentName: string) => unknown;
