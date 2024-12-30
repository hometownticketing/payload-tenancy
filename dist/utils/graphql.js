"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findArgumentByName = exports.findQueryByName = void 0;
var findQueryByName = function (document, queryName) {
    var queryOperation = document.definitions.find(function (def) { return def.kind === "OperationDefinition" && def.operation === "query"; });
    if (!queryOperation || queryOperation.kind !== "OperationDefinition")
        return undefined;
    return queryOperation.selectionSet.selections.find(function (sel) { return sel.kind === "Field" && sel.name.value === queryName; });
};
exports.findQueryByName = findQueryByName;
var findArgumentByName = function (selection, variables, argumentName) {
    var _a;
    if (selection.kind !== "Field")
        return undefined;
    var arg = (_a = selection.arguments) === null || _a === void 0 ? void 0 : _a.find(function (a) { return a.name.value === argumentName; });
    if (!arg)
        return undefined;
    var kind = arg.value.kind;
    if ("value" in arg.value)
        return arg.value.value;
    if (kind === "Variable")
        return variables[arg.value.name.value];
};
exports.findArgumentByName = findArgumentByName;
