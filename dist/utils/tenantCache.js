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
exports.forgetTenants = exports.findTenantById = exports.findTenantBySlug = void 0;
// Every request resolves its tenant, and tenants rarely change, so a minute of
// staleness on other servers is cheaper than a lookup per request.
var TTL_MS = 60000;
// Misses are remembered too, and any path can produce one, so the cache needs a
// ceiling.
var MAX_ENTRIES = 5000;
var bySlug = new Map();
var byId = new Map();
var recall = function (cache, key) {
    var entry = cache.get(key);
    return entry && entry.expiresAt > Date.now() ? entry.lookup : undefined;
};
var remember = function (cache, key, lookup) {
    if (cache.size >= MAX_ENTRIES) {
        cache.clear();
    }
    cache.set(key, { lookup: lookup, expiresAt: Date.now() + TTL_MS });
    lookup.catch(function () {
        var _a;
        if (((_a = cache.get(key)) === null || _a === void 0 ? void 0 : _a.lookup) === lookup) {
            cache.delete(key);
        }
    });
};
var findTenant = function (_a) {
    var payload = _a.payload, tenantCollection = _a.tenantCollection, where = _a.where;
    return __awaiter(void 0, void 0, void 0, function () {
        var tenant;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, payload.find({
                        collection: tenantCollection,
                        where: where,
                        depth: 0,
                        limit: 1,
                        pagination: false,
                    })];
                case 1:
                    tenant = (_b.sent()).docs[0];
                    return [2 /*return*/, tenant];
            }
        });
    });
};
var findTenantBySlug = function (_a) {
    var payload = _a.payload, tenantCollection = _a.tenantCollection, slug = _a.slug;
    var known = recall(bySlug, slug);
    if (known) {
        return known;
    }
    var lookup = findTenant({
        payload: payload,
        tenantCollection: tenantCollection,
        where: { slug: { equals: slug } },
    }).then(function (tenant) {
        if (tenant) {
            remember(byId, String(tenant.id), Promise.resolve(tenant));
        }
        return tenant;
    });
    remember(bySlug, slug, lookup);
    return lookup;
};
exports.findTenantBySlug = findTenantBySlug;
var findTenantById = function (_a) {
    var payload = _a.payload, tenantCollection = _a.tenantCollection, id = _a.id;
    var known = recall(byId, String(id));
    if (known) {
        return known;
    }
    var lookup = findTenant({
        payload: payload,
        tenantCollection: tenantCollection,
        where: { id: { equals: id } },
    }).then(function (tenant) {
        if (tenant) {
            remember(bySlug, tenant.slug, Promise.resolve(tenant));
        }
        return tenant;
    });
    remember(byId, String(id), lookup);
    return lookup;
};
exports.findTenantById = findTenantById;
var forgetTenants = function () {
    bySlug.clear();
    byId.clear();
};
exports.forgetTenants = forgetTenants;
