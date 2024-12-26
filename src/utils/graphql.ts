import { DocumentNode, SelectionNode } from 'graphql'

export const findQueryByName = (document: DocumentNode, queryName: string): SelectionNode | undefined => {
  const queryOperation = document.definitions.find(
    def => def.kind === 'OperationDefinition' && def.operation === 'query'
  );
  
  if (!queryOperation || queryOperation.kind !== 'OperationDefinition') return undefined;
  
  return queryOperation.selectionSet.selections.find(
    sel => sel.kind === 'Field' && sel.name.value === queryName
  );
};

export const findArgumentByName = (selection: SelectionNode, variables: object, argumentName: string): unknown => {
  if (selection.kind !== 'Field') return undefined;

  const arg = selection.arguments?.find((a) => a.name.value === argumentName);
  if (!arg) return undefined;

  const {kind} = arg.value

  if ('value' in arg.value) return arg.value.value
  if (kind === 'Variable') return variables[arg.value.name.value]
};
