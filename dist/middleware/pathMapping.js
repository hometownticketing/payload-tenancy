"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPathMapping = void 0;
/**
 * Map the requested path to correct tenant. Adds the tenant to the request
 * object.
 *
 * @returns Express middleware
 */
var createPathMapping = function (_a) {
    var options = _a.options, config = _a.config, payload = _a.payload;
    return function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
        var adminRoute, encodedTenantSlug, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    adminRoute = ((_b = config.routes) === null || _b === void 0 ? void 0 : _b.admin) || "/admin";
                    if (new RegExp("^".concat(adminRoute, "(/@|.*\\.[^/]+$)")).test(req.url)) {
                        next();
                        return [2 /*return*/];
                    }
                    // Deny access to the normal admin route.
                    if (req.url === adminRoute || req.url.startsWith(adminRoute + "/")) {
                        res.status(404).send();
                        return [2 /*return*/];
                    }
                    encodedTenantSlug = req.url.slice(1).split("/").slice(0, 2).join("/");
                    if (!encodedTenantSlug) {
                        res.status(404).send();
                        return [2 /*return*/];
                    }
                    // Check that tenant exists and attach it to the request.
                    _a = req;
                    return [4 /*yield*/, payload.find({
                            collection: options.tenantCollection,
                            where: { slug: { equals: decodeURIComponent(encodedTenantSlug) } },
                        })];
                case 1:
                    // Check that tenant exists and attach it to the request.
                    _a.tenant = (_c.sent()).docs[0];
                    // Remove tenant slug from the request URL so it can be processed normally
                    // by payload.
                    if (req.tenant) {
                        req.url = req.url.slice("/".concat(encodedTenantSlug).length);
                    }
                    next();
                    return [2 /*return*/];
            }
        });
    }); };
};
exports.createPathMapping = createPathMapping;
