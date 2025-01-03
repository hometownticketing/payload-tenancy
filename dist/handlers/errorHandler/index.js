"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = void 0;
var payload_1 = require("payload");
var handleError = function (error, res, operation) {
    payload_1.default.logger.error(error, "Error ".concat(operation, ": ").concat(error instanceof Error ? error.message : "Unknown error"));
    res.status(500).json({
        error: "Failed to ".concat(operation),
        message: error instanceof Error ? error.message : "Unknown error occurred",
    });
};
exports.handleError = handleError;
